import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export interface ValidationWarning {
  type: "duration_threshold" | "teacher_conflict" | "room_conflict" | "invalid_time";
  message: string;
  severity: "warning" | "error";
}

export interface ScheduleItemWithWarnings {
  id: string;
  start_time: string | null;
  duration_minutes: number;
  group_name: string;
  choreography: string | null;
  teacher_id: string | null;
  participants_count: number | null;
  room_id: string | null;
  notes: string | null;
  warnings: ValidationWarning[];
}

export interface SmartScheduleResult {
  data: ScheduleItemWithWarnings;
  warnings: ValidationWarning[];
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export const scheduleValidationService = {
  /**
   * Calculate auto start_time for a schedule item based on previous item
   * if current start_time is null
   */
  async calculateAutoTime(
    sessionId: string,
    tenantId: string,
    currentPosition: number,
    currentStartTime: string | null
  ): Promise<string | null> {
    if (currentStartTime) {
      return currentStartTime;
    }

    // Get previous item
    const { data: previousItems } = await supabaseAdmin
      .from("event_schedule_items")
      .select("start_time, duration_minutes")
      .eq("session_id", sessionId)
      .eq("tenant_id", tenantId)
      .lt("position", currentPosition)
      .order("position", { ascending: false })
      .limit(1);

    if (!previousItems || previousItems.length === 0) {
      // Get session start time
      const { data: session } = await supabaseAdmin
        .from("event_sessions")
        .select("start_time")
        .eq("id", sessionId)
        .eq("tenant_id", tenantId)
        .single();

      return session?.start_time || null;
    }

    const previous = previousItems[0];
    if (!previous.start_time) {
      return null;
    }

    return addMinutesToTime(previous.start_time, previous.duration_minutes);
  },

  /**
   * Validate schedule item and return warnings
   */
  async validateScheduleItem(
    sessionId: string,
    _eventId: string,
    tenantId: string,
    item: {
      start_time: string | null;
      duration_minutes: number;
      teacher_id: string | null;
      room_id: string | null;
      position: number;
    },
    excludeItemId?: string
  ): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    // Validation 1: Duration must be positive
    if (item.duration_minutes <= 0) {
      warnings.push({
        type: "invalid_time",
        message: "Duration must be positive",
        severity: "error",
      });
      return warnings;
    }

    // Validation 2: Check if duration exceeds session threshold (600 min = 10 hours)
    const { data: scheduleItems } = await supabaseAdmin
      .from("event_schedule_items")
      .select("duration_minutes")
      .eq("session_id", sessionId)
      .eq("tenant_id", tenantId)
      .neq("id", excludeItemId || "");

    const totalDuration = (scheduleItems || []).reduce(
      (sum, i) => sum + i.duration_minutes,
      item.duration_minutes
    );

    if (totalDuration > 600) {
      warnings.push({
        type: "duration_threshold",
        message: `Session total duration (${totalDuration} min) exceeds 10 hours threshold`,
        severity: "warning",
      });
    }

    // Validation 3: Detect teacher conflicts
    if (item.teacher_id && item.start_time) {
      const { data: conflicts } = await supabaseAdmin
        .from("event_schedule_items")
        .select("id, start_time, duration_minutes")
        .eq("session_id", sessionId)
        .eq("teacher_id", item.teacher_id)
        .eq("tenant_id", tenantId)
        .neq("id", excludeItemId || "");

      for (const conflict of conflicts || []) {
        if (!conflict.start_time) continue;

        const itemStart = timeToMinutes(item.start_time);
        const itemEnd = itemStart + item.duration_minutes;
        const conflictStart = timeToMinutes(conflict.start_time);
        const conflictEnd = conflictStart + conflict.duration_minutes;

        // Check for overlap
        if (itemStart < conflictEnd && itemEnd > conflictStart) {
          warnings.push({
            type: "teacher_conflict",
            message: "Teacher has overlapping assignment in this session",
            severity: "warning",
          });
          break;
        }
      }
    }

    // Validation 4: Detect room conflicts
    if (item.room_id && item.start_time) {
      const { data: conflicts } = await supabaseAdmin
        .from("event_schedule_items")
        .select("id, start_time, duration_minutes")
        .eq("session_id", sessionId)
        .eq("room_id", item.room_id)
        .eq("tenant_id", tenantId)
        .neq("id", excludeItemId || "");

      for (const conflict of conflicts || []) {
        if (!conflict.start_time) continue;

        const itemStart = timeToMinutes(item.start_time);
        const itemEnd = itemStart + item.duration_minutes;
        const conflictStart = timeToMinutes(conflict.start_time);
        const conflictEnd = conflictStart + conflict.duration_minutes;

        // Check for overlap
        if (itemStart < conflictEnd && itemEnd > conflictStart) {
          warnings.push({
            type: "room_conflict",
            message: "Room has conflicting assignment in this session",
            severity: "warning",
          });
          break;
        }
      }
    }

    return warnings;
  },

  /**
   * Process schedule item with smart logic: auto-time + validations
   */
  async processScheduleItem(
    sessionId: string,
    eventId: string,
    tenantId: string,
    position: number,
    item: {
      start_time: string | null;
      duration_minutes: number;
      group_name: string;
      choreography: string | null;
      teacher_id: string | null;
      participants_count: number | null;
      room_id: string | null;
      notes: string | null;
    },
    excludeItemId?: string
  ): Promise<SmartScheduleResult> {
    // Calculate auto time if not provided
    const calculatedTime = await this.calculateAutoTime(
      sessionId,
      tenantId,
      position,
      item.start_time
    );

    const itemWithTime = {
      ...item,
      start_time: item.start_time || calculatedTime,
    };

    // Validate
    const warnings = await this.validateScheduleItem(
      sessionId,
      eventId,
      tenantId,
      {
        start_time: itemWithTime.start_time,
        duration_minutes: itemWithTime.duration_minutes,
        teacher_id: itemWithTime.teacher_id,
        room_id: itemWithTime.room_id,
        position,
      },
      excludeItemId
    );

    return {
      data: {
        id: "", // Will be set by caller
        ...itemWithTime,
        warnings,
      },
      warnings,
    };
  },

  /**
   * Recalculate all times in a session based on start times and durations
   */
  async recalculateSessionTimes(
    sessionId: string,
    tenantId: string
  ): Promise<{ id: string; start_time: string }[]> {
    const { data: session } = await supabaseAdmin
      .from("event_sessions")
      .select("start_time")
      .eq("id", sessionId)
      .eq("tenant_id", tenantId)
      .single();

    if (!session) {
      throw new Error("Session not found");
    }

    const { data: items } = await supabaseAdmin
      .from("event_schedule_items")
      .select("*")
      .eq("session_id", sessionId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });

    if (!items || items.length === 0) {
      return [];
    }

    const updates: { id: string; start_time: string }[] = [];
    let currentTime = session.start_time;

    for (const item of items) {
      if (!item.start_time) {
        item.start_time = currentTime;
      }

      updates.push({
        id: item.id,
        start_time: item.start_time,
      });

      // Move cursor forward
      currentTime = addMinutesToTime(item.start_time, item.duration_minutes);
    }

    return updates;
  },
};
