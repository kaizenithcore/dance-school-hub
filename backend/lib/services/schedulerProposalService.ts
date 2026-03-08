import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export interface ProposalCreateOperation {
  classId: string;
  roomId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface ScheduleProposal {
  id: string;
  label: "A" | "B" | "C";
  strategy: string;
  score: number;
  summary: {
    requestedSessions: number;
    plannedSessions: number;
    unplannedSessions: number;
  };
  creates: ProposalCreateOperation[];
}

interface ClassRow {
  id: string;
  name: string;
  teacher_id: string | null;
  room_id: string | null;
  weekly_frequency: number | null;
  status: string;
}

interface RoomRow {
  id: string;
  is_active: boolean;
}

interface ScheduleRow {
  id: string;
  class_id: string;
  room_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
}

interface EnrollmentRow {
  class_id: string;
}

interface Slot {
  weekday: number;
  roomId: string;
  startMinutes: number;
  endMinutes: number;
  classId: string;
  teacherId: string | null;
}

type Variant = "A" | "B" | "C";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseHour(value: unknown, fallback: number): number {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  const candidate = Number.parseInt(value.split(":")[0] || "", 10);
  return Number.isFinite(candidate) ? candidate : fallback;
}

function parseWorkDays(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) return [1, 2, 3, 4, 5, 6];
  const map = new Map<string, number>([
    ["Lunes", 1],
    ["Martes", 2],
    ["Miércoles", 3],
    ["Miercoles", 3],
    ["Jueves", 4],
    ["Viernes", 5],
    ["Sábado", 6],
    ["Sabado", 6],
    ["Domingo", 7],
  ]);

  const days = value
    .filter((day): day is string => typeof day === "string")
    .map((day) => map.get(day.trim()))
    .filter((day): day is number => typeof day === "number");

  return days.length > 0 ? Array.from(new Set(days)) : [1, 2, 3, 4, 5, 6];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((part) => Number.parseInt(part || "0", 10));
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function durationMinutes(start: string, end: string): number {
  return Math.max(timeToMinutes(end) - timeToMinutes(start), 30);
}

function normalizeClassGroup(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const schedulerProposalService = {
  async generate(tenantId: string): Promise<{ generatedAt: string; proposals: ScheduleProposal[] }> {
    const today = new Date().toISOString().slice(0, 10);

    const [
      settingsResponse,
      classesResponse,
      roomsResponse,
      schedulesResponse,
      enrollmentsResponse,
    ] = await Promise.all([
      supabaseAdmin
        .from("school_settings")
        .select("schedule_config")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabaseAdmin
        .from("classes")
        .select("id, name, teacher_id, room_id, weekly_frequency, status")
        .eq("tenant_id", tenantId)
        .neq("status", "inactive")
        .returns<ClassRow[]>(),
      supabaseAdmin
        .from("rooms")
        .select("id, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .returns<RoomRow[]>(),
      supabaseAdmin
        .from("class_schedules")
        .select("id, class_id, room_id, weekday, start_time, end_time, is_active, effective_from, effective_to")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .lte("effective_from", today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .returns<ScheduleRow[]>(),
      supabaseAdmin
        .from("enrollments")
        .select("class_id")
        .eq("tenant_id", tenantId)
        .eq("status", "confirmed")
        .returns<EnrollmentRow[]>(),
    ]);

    if (settingsResponse.error) throw new Error(`Failed to load settings: ${settingsResponse.error.message}`);
    if (classesResponse.error) throw new Error(`Failed to load classes: ${classesResponse.error.message}`);
    if (roomsResponse.error) throw new Error(`Failed to load rooms: ${roomsResponse.error.message}`);
    if (schedulesResponse.error) throw new Error(`Failed to load schedules: ${schedulesResponse.error.message}`);
    if (enrollmentsResponse.error) throw new Error(`Failed to load enrollments: ${enrollmentsResponse.error.message}`);

    const classes = classesResponse.data || [];
    const rooms = roomsResponse.data || [];
    const currentSchedules = schedulesResponse.data || [];
    const enrollments = enrollmentsResponse.data || [];

    if (rooms.length === 0 || classes.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        proposals: [
          { id: "A", label: "A", strategy: "Demanda", score: 0, summary: { requestedSessions: 0, plannedSessions: 0, unplannedSessions: 0 }, creates: [] },
          { id: "B", label: "B", strategy: "Continuidad de profesor", score: 0, summary: { requestedSessions: 0, plannedSessions: 0, unplannedSessions: 0 }, creates: [] },
          { id: "C", label: "C", strategy: "Balance de aulas", score: 0, summary: { requestedSessions: 0, plannedSessions: 0, unplannedSessions: 0 }, creates: [] },
        ],
      };
    }

    const scheduleConfig = asObject(settingsResponse.data?.schedule_config);
    const startHour = parseHour(scheduleConfig.startHour, 8);
    const endHour = parseHour(scheduleConfig.endHour, 21);
    const workDays = parseWorkDays(scheduleConfig.workDays);

    let blockMinutes = 90;
    const blockDurationRaw = scheduleConfig.blockDuration;
    if (typeof blockDurationRaw === "number" && Number.isFinite(blockDurationRaw)) {
      blockMinutes = blockDurationRaw > 10 ? Math.floor(blockDurationRaw) : Math.floor(blockDurationRaw * 60);
    }

    const classById = new Map(classes.map((klass) => [klass.id, klass]));
    const classGroupById = new Map(classes.map((klass) => [klass.id, normalizeClassGroup(klass.name)]));

    const confirmedByClass = new Map<string, number>();
    for (const enrollment of enrollments) {
      confirmedByClass.set(enrollment.class_id, (confirmedByClass.get(enrollment.class_id) || 0) + 1);
    }

    const existingCountByClass = new Map<string, number>();
    const durationByClass = new Map<string, number>();

    for (const schedule of currentSchedules) {
      existingCountByClass.set(schedule.class_id, (existingCountByClass.get(schedule.class_id) || 0) + 1);
      durationByClass.set(schedule.class_id, durationMinutes(schedule.start_time, schedule.end_time));
    }

    const baseSlots: Slot[] = currentSchedules.map((item) => ({
      weekday: item.weekday,
      roomId: item.room_id,
      startMinutes: timeToMinutes(item.start_time),
      endMinutes: timeToMinutes(item.end_time),
      classId: item.class_id,
      teacherId: classById.get(item.class_id)?.teacher_id || null,
    }));

    const requestUnits = classes.flatMap((klass) => {
      const target = Math.max(klass.weekly_frequency || 1, 1);
      const currentCount = existingCountByClass.get(klass.id) || 0;
      const missing = Math.max(target - currentCount, 0);
      const demand = confirmedByClass.get(klass.id) || 0;
      return Array.from({ length: missing }, (_, idx) => ({
        classId: klass.id,
        className: klass.name,
        classGroup: classGroupById.get(klass.id) || normalizeClassGroup(klass.name),
        teacherId: klass.teacher_id,
        preferredRoomId: klass.room_id,
        duration: durationByClass.get(klass.id) || blockMinutes,
        demand,
        sequence: idx,
      }));
    });

    const requestedSessions = requestUnits.length;

    const generateVariant = (variant: Variant): ScheduleProposal => {
      const slots = [...baseSlots];
      const creates: ProposalCreateOperation[] = [];
      let totalCost = 0;
      const groupPatterns = new Map<string, Array<{ start: number; end: number; weekday: number }>>();

      for (const slot of baseSlots) {
        const groupKey = classGroupById.get(slot.classId);
        if (!groupKey) continue;
        const current = groupPatterns.get(groupKey) || [];
        current.push({ start: slot.startMinutes, end: slot.endMinutes, weekday: slot.weekday });
        groupPatterns.set(groupKey, current);
      }

      const roomLoadMinutes = new Map<string, number>();
      for (const slot of slots) {
        roomLoadMinutes.set(slot.roomId, (roomLoadMinutes.get(slot.roomId) || 0) + (slot.endMinutes - slot.startMinutes));
      }

      const dayOrder =
        variant === "A"
          ? [...workDays]
          : variant === "B"
            ? [...workDays].sort((a, b) => (a % 2) - (b % 2))
            : [...workDays].reverse();

      const ordered = [...requestUnits].sort((a, b) => {
        if (variant === "A") {
          return b.demand - a.demand || a.className.localeCompare(b.className);
        }
        if (variant === "B") {
          return (a.teacherId || "").localeCompare(b.teacherId || "") || b.demand - a.demand;
        }
        return (a.preferredRoomId || "").localeCompare(b.preferredRoomId || "") || a.className.localeCompare(b.className);
      });

      for (const unit of ordered) {
        let best:
          | {
              weekday: number;
              roomId: string;
              startMinutes: number;
              endMinutes: number;
              cost: number;
            }
          | undefined;

        const roomsOrdered = [...rooms].sort((a, b) => {
          if (variant === "C") {
            return (roomLoadMinutes.get(a.id) || 0) - (roomLoadMinutes.get(b.id) || 0);
          }
          if (unit.preferredRoomId && (a.id === unit.preferredRoomId || b.id === unit.preferredRoomId)) {
            return a.id === unit.preferredRoomId ? -1 : 1;
          }
          return 0;
        });

        for (const weekday of dayOrder) {
          for (const room of roomsOrdered) {
            for (let hour = startHour; hour <= endHour; hour += 1) {
              const startMinutes = hour * 60;
              const endMinutes = startMinutes + unit.duration;
              if (endMinutes > endHour * 60) continue;

              const roomConflict = slots.some(
                (slot) => slot.weekday === weekday && slot.roomId === room.id && overlaps(startMinutes, endMinutes, slot.startMinutes, slot.endMinutes)
              );
              if (roomConflict) continue;

              const teacherConflict = unit.teacherId
                ? slots.some(
                    (slot) =>
                      slot.weekday === weekday &&
                      slot.teacherId &&
                      slot.teacherId === unit.teacherId &&
                      overlaps(startMinutes, endMinutes, slot.startMinutes, slot.endMinutes)
                  )
                : false;
              if (teacherConflict) continue;

              const classSameDay = slots.some((slot) => slot.weekday === weekday && slot.classId === unit.classId);
              const groupedSlots = groupPatterns.get(unit.classGroup) || [];
              const sameGroupSameTime = groupedSlots.some(
                (slot) => slot.start === startMinutes && slot.end === endMinutes
              );
              const minGroupDayDistance = groupedSlots.length > 0
                ? Math.min(...groupedSlots.map((slot) => Math.abs(slot.weekday - weekday)))
                : Number.POSITIVE_INFINITY;

              let cost = 0;
              if (classSameDay) cost += 35;

              if (groupedSlots.length > 0 && !sameGroupSameTime) {
                cost += 22;
              }

              if (Number.isFinite(minGroupDayDistance) && minGroupDayDistance < 2) {
                // Keep at least one day gap between sessions of same class name.
                cost += 45;
              }

              if (variant === "A") {
                if (startMinutes < 10 * 60 || startMinutes > 19 * 60) cost += 20;
                cost += Math.max(10 - unit.demand, 0) * 2;
              } else if (variant === "B") {
                const teacherSlots = unit.teacherId
                  ? slots.filter((slot) => slot.weekday === weekday && slot.teacherId === unit.teacherId)
                  : [];
                if (teacherSlots.length === 0) {
                  cost += 8;
                } else {
                  const minGap = Math.min(
                    ...teacherSlots.map((slot) =>
                      Math.min(Math.abs(startMinutes - slot.endMinutes), Math.abs(slot.startMinutes - endMinutes))
                    )
                  );
                  cost += Math.floor(minGap / 15);
                }
              } else {
                cost += Math.floor((roomLoadMinutes.get(room.id) || 0) / 30);
                if (unit.preferredRoomId && room.id !== unit.preferredRoomId) cost += 6;
              }

              if (!best || cost < best.cost) {
                best = { weekday, roomId: room.id, startMinutes, endMinutes, cost };
              }
            }
          }
        }

        if (!best) {
          continue;
        }

        slots.push({
          weekday: best.weekday,
          roomId: best.roomId,
          startMinutes: best.startMinutes,
          endMinutes: best.endMinutes,
          classId: unit.classId,
          teacherId: unit.teacherId,
        });

        const existingGroup = groupPatterns.get(unit.classGroup) || [];
        existingGroup.push({ start: best.startMinutes, end: best.endMinutes, weekday: best.weekday });
        groupPatterns.set(unit.classGroup, existingGroup);

        roomLoadMinutes.set(best.roomId, (roomLoadMinutes.get(best.roomId) || 0) + (best.endMinutes - best.startMinutes));
        totalCost += best.cost;

        creates.push({
          classId: unit.classId,
          roomId: best.roomId,
          weekday: best.weekday,
          startTime: minutesToTime(best.startMinutes),
          endTime: minutesToTime(best.endMinutes),
          effectiveFrom: today,
          isActive: true,
        });
      }

      const plannedSessions = creates.length;
      const unplannedSessions = Math.max(requestedSessions - plannedSessions, 0);
      const score = Math.max(0, 100 - Math.round(totalCost / Math.max(plannedSessions, 1)) - unplannedSessions * 18);

      return {
        id: variant,
        label: variant,
        strategy:
          variant === "A"
            ? "Demanda primero"
            : variant === "B"
              ? "Continuidad de profesor"
              : "Balance de aulas",
        score,
        summary: {
          requestedSessions,
          plannedSessions,
          unplannedSessions,
        },
        creates,
      };
    };

    return {
      generatedAt: new Date().toISOString(),
      proposals: [generateVariant("A"), generateVariant("B"), generateVariant("C")],
    };
  },
};
