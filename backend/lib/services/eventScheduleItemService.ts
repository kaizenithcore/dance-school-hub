import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { classService } from "@/lib/services/classService";
import { scheduleValidationService, type ValidationWarning } from "@/lib/services/scheduleValidationService";
import type {
  CreateScheduleItemInput,
  ReorderScheduleItemsInput,
  UpdateScheduleItemInput,
} from "@/lib/validators/eventScheduleItemSchemas";

async function writeAuditLog(
  tenantId: string,
  actorUserId: string | undefined,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin.from("audit_log").insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error(`Failed to write audit log for ${action}: ${error.message}`);
  }
}

export interface ScheduleItemDB {
  id: string;
  session_id: string;
  event_id: string;
  tenant_id: string;
  position: number;
  start_time: string | null;
  duration_minutes: number;
  group_name: string;
  choreography: string | null;
  teacher_id: string | null;
  participants_count: number | null;
  room_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FrontendScheduleItem {
  id: string;
  time: string;
  duration: number;
  groupName: string;
  choreography?: string;
  teacher?: string;
  participantsCount?: number;
  room?: string;
  notes?: string;
  warnings?: ValidationWarning[];
}

interface RelatedLabels {
  teacher?: string;
  room?: string;
}

async function getRelatedLabels(
  tenantId: string,
  teacherId: string | null,
  roomId: string | null
): Promise<RelatedLabels> {
  const [teacherResult, roomResult] = await Promise.all([
    teacherId
      ? supabaseAdmin
          .from("teachers")
          .select("name")
          .eq("tenant_id", tenantId)
          .eq("id", teacherId)
          .single()
      : Promise.resolve({ data: null, error: null }),
    roomId
      ? supabaseAdmin
          .from("rooms")
          .select("name")
          .eq("tenant_id", tenantId)
          .eq("id", roomId)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    ...(teacherResult.data?.name && { teacher: teacherResult.data.name }),
    ...(roomResult.data?.name && { room: roomResult.data.name }),
  };
}

async function mapScheduleItemFromDB(item: ScheduleItemDB): Promise<FrontendScheduleItem> {
  const related = await getRelatedLabels(item.tenant_id, item.teacher_id, item.room_id);

  return {
    id: item.id,
    time: item.start_time || "",
    duration: item.duration_minutes,
    groupName: item.group_name,
    ...(item.choreography && { choreography: item.choreography }),
    ...(item.participants_count !== null && { participantsCount: item.participants_count }),
    ...(item.notes && { notes: item.notes }),
    ...related,
  };
}

async function verifySessionBelongsToEventAndTenant(
  tenantId: string,
  eventId: string,
  sessionId: string
): Promise<boolean> {
  const { data: session, error } = await supabaseAdmin
    .from("event_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("event_id", eventId)
    .eq("tenant_id", tenantId)
    .single();

  return !error && !!session;
}

async function verifyTeacherBelongsToTenant(tenantId: string, teacherId: string): Promise<boolean> {
  const { data: teacher, error } = await supabaseAdmin
    .from("teachers")
    .select("id")
    .eq("id", teacherId)
    .eq("tenant_id", tenantId)
    .single();

  return !error && !!teacher;
}

async function verifyRoomBelongsToTenant(tenantId: string, roomId: string): Promise<boolean> {
  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("tenant_id", tenantId)
    .single();

  return !error && !!room;
}

async function resolveClassAutofill(
  tenantId: string,
  classId: string | null | undefined,
  currentGroupName: string | null | undefined,
  currentTeacherId: string | null | undefined
): Promise<{ groupName: string; teacherId: string | null }> {
  const trimmedGroupName = currentGroupName?.trim() ?? "";

  if (!classId) {
    return {
      groupName: trimmedGroupName,
      teacherId: currentTeacherId ?? null,
    };
  }

  const classData = await classService.getClass(tenantId, classId);
  if (!classData) {
    throw new Error("Class not found or unauthorized");
  }

  const fallbackTeacherId = Array.isArray(classData.teachers) && classData.teachers.length > 0
    ? classData.teachers[0].id
    : classData.teacher_id;

  return {
    groupName: trimmedGroupName || classData.name,
    teacherId: currentTeacherId ?? fallbackTeacherId ?? null,
  };
}

export const eventScheduleItemService = {
  async listScheduleItems(
    tenantId: string,
    eventId: string,
    sessionId: string
  ): Promise<FrontendScheduleItem[]> {
    const isValid = await verifySessionBelongsToEventAndTenant(tenantId, eventId, sessionId);
    if (!isValid) {
      throw new Error("Session not found or unauthorized");
    }

    const { data: items, error } = await supabaseAdmin
      .from("event_schedule_items")
      .select("*")
      .eq("session_id", sessionId)
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch schedule items: ${error.message}`);
    }

    return Promise.all((items ?? []).map((item) => mapScheduleItemFromDB(item as ScheduleItemDB)));
  },

  async getScheduleItem(
    tenantId: string,
    eventId: string,
    sessionId: string,
    itemId: string
  ): Promise<FrontendScheduleItem | null> {
    const isValid = await verifySessionBelongsToEventAndTenant(tenantId, eventId, sessionId);
    if (!isValid) {
      throw new Error("Session not found or unauthorized");
    }

    const { data: item, error } = await supabaseAdmin
      .from("event_schedule_items")
      .select("*")
      .eq("id", itemId)
      .eq("session_id", sessionId)
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch schedule item: ${error.message}`);
    }

    return item ? mapScheduleItemFromDB(item as ScheduleItemDB) : null;
  },

  async createScheduleItem(
    tenantId: string,
    eventId: string,
    sessionId: string,
    data: CreateScheduleItemInput,
    actorUserId?: string
  ): Promise<FrontendScheduleItem> {
    const isValid = await verifySessionBelongsToEventAndTenant(tenantId, eventId, sessionId);
    if (!isValid) {
      throw new Error("Session not found or unauthorized");
    }

    const { data: items } = await supabaseAdmin
      .from("event_schedule_items")
      .select("position")
      .eq("session_id", sessionId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = (items && items.length > 0 ? items[0].position : -1) + 1;
    const autofill = await resolveClassAutofill(tenantId, data.class_id, data.group_name, data.teacher_id);

    if (!autofill.groupName) {
      throw new Error("Group name is required");
    }

    if (autofill.teacherId) {
      const isTeacherValid = await verifyTeacherBelongsToTenant(tenantId, autofill.teacherId);
      if (!isTeacherValid) {
        throw new Error("Teacher not found or unauthorized");
      }
    }

    if (data.room_id) {
      const isRoomValid = await verifyRoomBelongsToTenant(tenantId, data.room_id);
      if (!isRoomValid) {
        throw new Error("Room not found or unauthorized");
      }
    }

    const calculatedTime = await scheduleValidationService.calculateAutoTime(
      sessionId,
      tenantId,
      nextPosition,
      data.start_time ?? null
    );

    const warnings = await scheduleValidationService.validateScheduleItem(
      sessionId,
      eventId,
      tenantId,
      {
        start_time: data.start_time ?? calculatedTime,
        duration_minutes: data.duration_minutes,
        teacher_id: autofill.teacherId,
        room_id: data.room_id ?? null,
        position: nextPosition,
      }
    );

    const { data: item, error } = await supabaseAdmin
      .from("event_schedule_items")
      .insert({
        session_id: sessionId,
        event_id: eventId,
        tenant_id: tenantId,
        position: nextPosition,
        start_time: data.start_time ?? calculatedTime,
        duration_minutes: data.duration_minutes,
        group_name: autofill.groupName,
        choreography: data.choreography ?? null,
        teacher_id: autofill.teacherId,
        participants_count: data.participants_count ?? null,
        room_id: data.room_id ?? null,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create schedule item: ${error.message}`);
    }

    const mapped = await mapScheduleItemFromDB(item as ScheduleItemDB);
    if (warnings.length > 0) {
      mapped.warnings = warnings;
    }

    await writeAuditLog(tenantId, actorUserId, "create_schedule_item", "event_schedule_item", item.id, {
      eventId,
      sessionId,
      groupName: item.group_name,
      position: item.position,
    });

    return mapped;
  },

  async updateScheduleItem(
    tenantId: string,
    eventId: string,
    sessionId: string,
    itemId: string,
    data: UpdateScheduleItemInput,
    actorUserId?: string
  ): Promise<FrontendScheduleItem> {
    const isValid = await verifySessionBelongsToEventAndTenant(tenantId, eventId, sessionId);
    if (!isValid) {
      throw new Error("Session not found or unauthorized");
    }

    const { data: existingItem, error: existingError } = await supabaseAdmin
      .from("event_schedule_items")
      .select("*")
      .eq("id", itemId)
      .eq("session_id", sessionId)
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (existingError || !existingItem) {
      throw new Error("Schedule item not found or unauthorized");
    }

    const autofill = await resolveClassAutofill(
      tenantId,
      data.class_id,
      data.group_name ?? existingItem.group_name,
      data.teacher_id !== undefined ? data.teacher_id : existingItem.teacher_id
    );

    if (!autofill.groupName) {
      throw new Error("Group name is required");
    }

    if (autofill.teacherId) {
      const isTeacherValid = await verifyTeacherBelongsToTenant(tenantId, autofill.teacherId);
      if (!isTeacherValid) {
        throw new Error("Teacher not found or unauthorized");
      }
    }

    const roomId = data.room_id !== undefined ? data.room_id : existingItem.room_id;
    if (roomId) {
      const isRoomValid = await verifyRoomBelongsToTenant(tenantId, roomId);
      if (!isRoomValid) {
        throw new Error("Room not found or unauthorized");
      }
    }

    const effectiveStartTime = await scheduleValidationService.calculateAutoTime(
      sessionId,
      tenantId,
      existingItem.position,
      data.start_time !== undefined ? data.start_time : existingItem.start_time
    );

    const warnings = await scheduleValidationService.validateScheduleItem(
      sessionId,
      eventId,
      tenantId,
      {
        start_time: effectiveStartTime,
        duration_minutes: data.duration_minutes ?? existingItem.duration_minutes,
        teacher_id: autofill.teacherId,
        room_id: roomId,
        position: existingItem.position,
      },
      itemId
    );

    const { data: updatedItem, error } = await supabaseAdmin
      .from("event_schedule_items")
      .update({
        ...(data.duration_minutes !== undefined && { duration_minutes: data.duration_minutes }),
        group_name: autofill.groupName,
        ...((data.start_time !== undefined || existingItem.start_time === null) && { start_time: effectiveStartTime }),
        ...(data.choreography !== undefined && { choreography: data.choreography }),
        teacher_id: autofill.teacherId,
        ...(data.participants_count !== undefined && { participants_count: data.participants_count }),
        ...(data.room_id !== undefined && { room_id: data.room_id }),
        ...(data.notes !== undefined && { notes: data.notes }),
      })
      .eq("id", itemId)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update schedule item: ${error.message}`);
    }

    const mapped = await mapScheduleItemFromDB(updatedItem as ScheduleItemDB);
    if (warnings.length > 0) {
      mapped.warnings = warnings;
    }

    await writeAuditLog(tenantId, actorUserId, "update_schedule_item", "event_schedule_item", itemId, {
      eventId,
      sessionId,
      fields: Object.keys(data),
    });

    return mapped;
  },

  async deleteScheduleItem(
    tenantId: string,
    eventId: string,
    sessionId: string,
    itemId: string,
    actorUserId?: string
  ): Promise<void> {
    const { data: item, error: itemError } = await supabaseAdmin
      .from("event_schedule_items")
      .select("id")
      .eq("id", itemId)
      .eq("session_id", sessionId)
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (itemError || !item) {
      throw new Error("Schedule item not found or unauthorized");
    }

    const { error } = await supabaseAdmin
      .from("event_schedule_items")
      .delete()
      .eq("id", itemId)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Failed to delete schedule item: ${error.message}`);
    }

    await writeAuditLog(tenantId, actorUserId, "delete_schedule_item", "event_schedule_item", itemId, {
      eventId,
      sessionId,
    });
  },

  async reorderScheduleItems(
    tenantId: string,
    eventId: string,
    sessionId: string,
    input: ReorderScheduleItemsInput
  ): Promise<void> {
    const isValid = await verifySessionBelongsToEventAndTenant(tenantId, eventId, sessionId);
    if (!isValid) {
      throw new Error("Session not found or unauthorized");
    }

    const itemIds = input.positions.map((position) => position.id);
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("event_schedule_items")
      .select("id")
      .eq("session_id", sessionId)
      .eq("tenant_id", tenantId)
      .in("id", itemIds);

    if (itemsError) {
      throw new Error(`Failed to verify items: ${itemsError.message}`);
    }

    if (!items || items.length !== itemIds.length) {
      throw new Error("Some items not found or unauthorized");
    }

    const results = await Promise.all(
      input.positions.map((position) =>
        supabaseAdmin
          .from("event_schedule_items")
          .update({ position: position.position })
          .eq("id", position.id)
          .eq("tenant_id", tenantId)
      )
    );

    for (const result of results) {
      if (result.error) {
        throw new Error(`Failed to reorder items: ${result.error.message}`);
      }
    }
  },
};