import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

type InsightSeverity = "high" | "medium" | "low";
type InsightType = "low_demand" | "over_demand" | "teacher_gap" | "room_underutilized";

export interface ScheduleInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  suggestedAction: string;
  classId?: string;
  className?: string;
  teacherId?: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
  weekday?: number;
  metrics: Record<string, number | string>;
}

export interface ScheduleInsightsResult {
  generatedAt: string;
  summary: {
    totalAlerts: number;
    high: number;
    medium: number;
    low: number;
    lowDemandClasses: number;
    overDemandClasses: number;
    teacherGaps: number;
    underutilizedRooms: number;
  };
  metrics: {
    totalClassesWithSchedule: number;
    avgClassOccupancyPct: number;
    totalRooms: number;
    avgRoomUtilizationPct: number;
  };
  alerts: ScheduleInsight[];
}

interface SettingsRow {
  schedule_config: Record<string, unknown> | null;
}

interface ClassRow {
  id: string;
  name: string;
  teacher_id: string | null;
  capacity: number;
  status: string;
}

interface EnrollmentRow {
  class_id: string;
}

interface TeacherRow {
  id: string;
  name: string;
}

interface RoomRow {
  id: string;
  name: string;
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

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseHour(value: unknown, fallback: number): number {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  const candidate = Number.parseInt(value.split(":")[0] || "", 10);
  return Number.isFinite(candidate) ? candidate : fallback;
}

function parseWorkDays(value: unknown): number {
  if (!Array.isArray(value)) return 6;
  const validDays = value.filter((day) => typeof day === "string" && day.trim().length > 0);
  return validDays.length > 0 ? validDays.length : 6;
}

function durationHours(start: string, end: string): number {
  const [startHour, startMinute] = start.split(":").map((part) => Number.parseInt(part || "0", 10));
  const [endHour, endMinute] = end.split(":").map((part) => Number.parseInt(part || "0", 10));
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const diff = endMinutes - startMinutes;
  return diff > 0 ? diff / 60 : 0;
}

function severityRank(severity: InsightSeverity): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function occupancySeverity(occupancyPct: number): InsightSeverity {
  if (occupancyPct < 20) return "high";
  if (occupancyPct < 35) return "medium";
  return "low";
}

export const scheduleInsightsService = {
  async getInsights(tenantId: string): Promise<ScheduleInsightsResult> {
    const today = new Date().toISOString().slice(0, 10);

    const [
      settingsResponse,
      classesResponse,
      enrollmentsResponse,
      teachersResponse,
      roomsResponse,
      schedulesResponse,
    ] = await Promise.all([
      supabaseAdmin
        .from("school_settings")
        .select("schedule_config")
        .eq("tenant_id", tenantId)
        .maybeSingle<SettingsRow>(),
      supabaseAdmin
        .from("classes")
        .select("id, name, teacher_id, capacity, status")
        .eq("tenant_id", tenantId)
        .neq("status", "inactive")
        .returns<ClassRow[]>(),
      supabaseAdmin
        .from("enrollments")
        .select("class_id")
        .eq("tenant_id", tenantId)
        .eq("status", "confirmed")
        .returns<EnrollmentRow[]>(),
      supabaseAdmin
        .from("teachers")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .neq("status", "inactive")
        .returns<TeacherRow[]>(),
      supabaseAdmin
        .from("rooms")
        .select("id, name, is_active")
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
    ]);

    if (settingsResponse.error) {
      throw new Error(`Failed to load schedule settings: ${settingsResponse.error.message}`);
    }
    if (classesResponse.error) {
      throw new Error(`Failed to load classes: ${classesResponse.error.message}`);
    }
    if (enrollmentsResponse.error) {
      throw new Error(`Failed to load enrollments: ${enrollmentsResponse.error.message}`);
    }
    if (teachersResponse.error) {
      throw new Error(`Failed to load teachers: ${teachersResponse.error.message}`);
    }
    if (roomsResponse.error) {
      throw new Error(`Failed to load rooms: ${roomsResponse.error.message}`);
    }
    if (schedulesResponse.error) {
      throw new Error(`Failed to load schedules: ${schedulesResponse.error.message}`);
    }

    const scheduleConfig = asObject(settingsResponse.data?.schedule_config);
    const startHour = parseHour(scheduleConfig.startHour, 8);
    const endHour = parseHour(scheduleConfig.endHour, 20);
    const workDays = parseWorkDays(scheduleConfig.workDays);
    const weeklyCapacityHours = Math.max(endHour - startHour, 1) * workDays;

    const classes = classesResponse.data || [];
    const enrollments = enrollmentsResponse.data || [];
    const teachers = teachersResponse.data || [];
    const rooms = roomsResponse.data || [];
    const schedules = schedulesResponse.data || [];

    const classById = new Map(classes.map((row) => [row.id, row]));
    const teacherById = new Map(teachers.map((row) => [row.id, row]));

    const confirmedByClass = new Map<string, number>();
    for (const enrollment of enrollments) {
      confirmedByClass.set(enrollment.class_id, (confirmedByClass.get(enrollment.class_id) || 0) + 1);
    }

    const classHours = new Map<string, number>();
    const roomHours = new Map<string, number>();
    const teacherSlots = new Map<string, Array<{ weekday: number; start: string; end: string }>>();

    for (const schedule of schedules) {
      const hours = durationHours(schedule.start_time, schedule.end_time);
      classHours.set(schedule.class_id, (classHours.get(schedule.class_id) || 0) + hours);
      roomHours.set(schedule.room_id, (roomHours.get(schedule.room_id) || 0) + hours);

      const classData = classById.get(schedule.class_id);
      if (classData?.teacher_id) {
        const key = classData.teacher_id;
        const list = teacherSlots.get(key) || [];
        list.push({ weekday: schedule.weekday, start: schedule.start_time, end: schedule.end_time });
        teacherSlots.set(key, list);
      }
    }

    const alerts: ScheduleInsight[] = [];

    // Low / over demand by class occupancy
    for (const classData of classes) {
      const scheduledHours = classHours.get(classData.id) || 0;
      if (scheduledHours <= 0) continue;

      const capacity = Math.max(classData.capacity || 0, 1);
      const confirmed = confirmedByClass.get(classData.id) || 0;
      const occupancyPct = (confirmed / capacity) * 100;

      if (occupancyPct < 40) {
        const severity = occupancySeverity(occupancyPct);
        alerts.push({
          id: `low-demand-${classData.id}`,
          type: "low_demand",
          severity,
          title: `Baja demanda en ${classData.name}`,
          description: `${confirmed} alumno(s) confirmados sobre ${capacity} plazas (${occupancyPct.toFixed(0)}%).`,
          suggestedAction: "Evalua cambiar horario, combinar grupos o lanzar una campaña para esta clase.",
          classId: classData.id,
          className: classData.name,
          teacherId: classData.teacher_id || undefined,
          teacherName: classData.teacher_id ? teacherById.get(classData.teacher_id)?.name : undefined,
          metrics: {
            confirmed,
            capacity,
            occupancyPct: Number(occupancyPct.toFixed(1)),
            scheduledHours: Number(scheduledHours.toFixed(1)),
          },
        });
      } else if (confirmed > capacity) {
        const overflow = confirmed - capacity;
        alerts.push({
          id: `over-demand-${classData.id}`,
          type: "over_demand",
          severity: overflow >= 3 ? "high" : "medium",
          title: `Sobredemanda en ${classData.name}`,
          description: `${confirmed} alumno(s) confirmados para ${capacity} plazas (exceso de ${overflow}).`,
          suggestedAction: "Abre un nuevo grupo, aumenta capacidad o mueve alumnos a otra franja.",
          classId: classData.id,
          className: classData.name,
          teacherId: classData.teacher_id || undefined,
          teacherName: classData.teacher_id ? teacherById.get(classData.teacher_id)?.name : undefined,
          metrics: {
            confirmed,
            capacity,
            overflow,
            occupancyPct: Number(occupancyPct.toFixed(1)),
          },
        });
      }
    }

    // Teacher schedule gaps
    for (const [teacherId, slots] of teacherSlots) {
      const teacher = teacherById.get(teacherId);
      const byWeekday = new Map<number, Array<{ start: string; end: string }>>();
      for (const slot of slots) {
        const list = byWeekday.get(slot.weekday) || [];
        list.push({ start: slot.start, end: slot.end });
        byWeekday.set(slot.weekday, list);
      }

      for (const [weekday, daySlots] of byWeekday) {
        if (daySlots.length < 2) continue;
        const sorted = [...daySlots].sort((a, b) => a.start.localeCompare(b.start));

        let maxGapMinutes = 0;
        for (let i = 0; i < sorted.length - 1; i += 1) {
          const currentEnd = sorted[i].end;
          const nextStart = sorted[i + 1].start;
          const gap = durationHours(currentEnd, nextStart) * 60;
          if (gap > maxGapMinutes) {
            maxGapMinutes = gap;
          }
        }

        if (maxGapMinutes >= 120) {
          alerts.push({
            id: `teacher-gap-${teacherId}-${weekday}`,
            type: "teacher_gap",
            severity: maxGapMinutes >= 180 ? "high" : "medium",
            title: `Hueco amplio de profesor${teacher?.name ? `: ${teacher.name}` : ""}`,
            description: `Se detecto un hueco maximo de ${Math.round(maxGapMinutes)} minutos en el dia ${weekday}.`,
            suggestedAction: "Reubica bloques para compactar agenda y reducir tiempo muerto del profesor.",
            teacherId,
            teacherName: teacher?.name,
            weekday,
            metrics: {
              maxGapMinutes: Math.round(maxGapMinutes),
              classesInDay: daySlots.length,
            },
          });
        }
      }
    }

    // Room underutilization
    for (const room of rooms) {
      const usedHours = roomHours.get(room.id) || 0;
      const utilizationPct = weeklyCapacityHours > 0 ? (usedHours / weeklyCapacityHours) * 100 : 0;

      if (utilizationPct < 20) {
        alerts.push({
          id: `room-under-${room.id}`,
          type: "room_underutilized",
          severity: utilizationPct < 10 ? "medium" : "low",
          title: `Aula infrautilizada: ${room.name}`,
          description: `Uso semanal estimado ${usedHours.toFixed(1)}h de ${weeklyCapacityHours.toFixed(1)}h (${utilizationPct.toFixed(1)}%).`,
          suggestedAction: "Concentra clases en esta aula o reduce disponibilidad de aulas con poco uso.",
          roomId: room.id,
          roomName: room.name,
          metrics: {
            usedHours: Number(usedHours.toFixed(1)),
            availableHours: Number(weeklyCapacityHours.toFixed(1)),
            utilizationPct: Number(utilizationPct.toFixed(1)),
          },
        });
      }
    }

    const sortedAlerts = alerts.sort((a, b) => {
      const severityDiff = severityRank(b.severity) - severityRank(a.severity);
      if (severityDiff !== 0) return severityDiff;
      return a.title.localeCompare(b.title);
    });

    const totalClassOccupancy = classes
      .filter((classData) => (classHours.get(classData.id) || 0) > 0)
      .map((classData) => {
        const confirmed = confirmedByClass.get(classData.id) || 0;
        const capacity = Math.max(classData.capacity || 0, 1);
        return (confirmed / capacity) * 100;
      });

    const roomUtilizations = rooms.map((room) => {
      const usedHours = roomHours.get(room.id) || 0;
      return weeklyCapacityHours > 0 ? (usedHours / weeklyCapacityHours) * 100 : 0;
    });

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalAlerts: sortedAlerts.length,
        high: sortedAlerts.filter((alert) => alert.severity === "high").length,
        medium: sortedAlerts.filter((alert) => alert.severity === "medium").length,
        low: sortedAlerts.filter((alert) => alert.severity === "low").length,
        lowDemandClasses: sortedAlerts.filter((alert) => alert.type === "low_demand").length,
        overDemandClasses: sortedAlerts.filter((alert) => alert.type === "over_demand").length,
        teacherGaps: sortedAlerts.filter((alert) => alert.type === "teacher_gap").length,
        underutilizedRooms: sortedAlerts.filter((alert) => alert.type === "room_underutilized").length,
      },
      metrics: {
        totalClassesWithSchedule: classes.filter((classData) => (classHours.get(classData.id) || 0) > 0).length,
        avgClassOccupancyPct:
          totalClassOccupancy.length > 0
            ? Number((totalClassOccupancy.reduce((sum, value) => sum + value, 0) / totalClassOccupancy.length).toFixed(1))
            : 0,
        totalRooms: rooms.length,
        avgRoomUtilizationPct:
          roomUtilizations.length > 0
            ? Number((roomUtilizations.reduce((sum, value) => sum + value, 0) / roomUtilizations.length).toFixed(1))
            : 0,
      },
      alerts: sortedAlerts.slice(0, 30),
    };
  },
};
