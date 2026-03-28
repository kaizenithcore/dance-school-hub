import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { examSuiteService } from "@/lib/services/examSuiteService";
import {
  createPortalNotification,
  PORTAL_NOTIFICATION_TYPES,
} from "@/lib/services/portalNotificationService";
import { stripeService } from "@/lib/services/stripeService";
import type { ListPaginationInput, ListStudentEventsInput } from "@/lib/validators/studentPortalSchemas";

interface StudentContext {
  userId: string;
  tenantId: string;
  studentId: string;
  studentName: string;
}

interface StudentProfileRow {
  student_id: string | null;
  tenant_id: string | null;
}

interface StudentPortalPaymentItem {
  id: string;
  enrollmentId: string | null;
  className: string;
  concept: string;
  amountCents: number;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paidAt: string | null;
  dueAt: string | null;
  createdAt: string;
  receiptId: string | null;
  receiptNumber: string | null;
  checkoutAvailable: boolean;
}

interface GamificationEventRow {
  id: string;
  event_type: "class_completed" | "event_attended" | "certification_passed";
  xp_delta: number;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

interface AchievementDefinitionRow {
  id: string;
  title: string;
  category: "attendance" | "events" | "milestones" | "certifications";
  metric_key: "class_completed_count" | "event_attended_count" | "certification_passed_count" | "total_xp";
  threshold_value: number;
  sort_order: number;
}

interface SyncGamificationResult {
  classesCompleted: number;
  eventsAttended: number;
  passedCertifications: number;
  xp: number;
  levelNumber: number;
  xpToNextLevel: number;
  achievements: Array<{
    id: string;
    title: string;
    category: "attendance" | "events" | "milestones" | "certifications";
    earned: boolean;
  }>;
  nextAchievements: Array<{
    id: string;
    title: string;
    category: "attendance" | "events" | "milestones" | "certifications";
    earned: boolean;
  }>;
}

const XP_BY_EVENT_TYPE = {
  class_completed: 20,
  event_attended: 80,
  certification_passed: 120,
} as const;

function weekdayLabel(weekday: number | null): string {
  const map: Record<number, string> = {
    1: "Lunes",
    2: "Martes",
    3: "Miercoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sabado",
    7: "Domingo",
  };

  if (!weekday) return "-";
  return map[weekday] || "-";
}

function formatTimeRange(startTime?: string | null, endTime?: string | null): string {
  if (!startTime) return "-";
  const start = startTime.slice(0, 5);
  const end = endTime ? endTime.slice(0, 5) : "";
  return end ? `${start}-${end}` : start;
}

async function resolveDefaultTenantId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.tenant_id ?? null;
}

async function resolveStudentContext(userId: string): Promise<StudentContext> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("student_profiles")
    .select("student_id, tenant_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to resolve student profile: ${profileError.message}`);
  }

  const studentProfile = (profile ?? null) as StudentProfileRow | null;

  if (studentProfile?.student_id && studentProfile?.tenant_id) {
    const { data: studentRow, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, name")
      .eq("id", studentProfile.student_id)
      .eq("tenant_id", studentProfile.tenant_id)
      .maybeSingle();

    if (studentError) {
      throw new Error(`Failed to resolve student: ${studentError.message}`);
    }

    if (studentRow) {
      return {
        userId,
        tenantId: studentProfile.tenant_id,
        studentId: studentRow.id,
        studentName: studentRow.name || "Alumno",
      };
    }
  }

  const { data: studentByUser, error: studentByUserError } = await supabaseAdmin
    .from("students")
    .select("id, tenant_id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (studentByUserError) {
    throw new Error(`Failed to resolve student by user: ${studentByUserError.message}`);
  }

  if (studentByUser) {
    return {
      userId,
      tenantId: studentByUser.tenant_id,
      studentId: studentByUser.id,
      studentName: studentByUser.name || "Alumno",
    };
  }

  const defaultTenantId = await resolveDefaultTenantId(userId);
  if (!defaultTenantId) {
    throw new Error("Student context not found");
  }

  const { data: userProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  const email = userProfile?.email || null;
  if (!email) {
    throw new Error("Student context not found");
  }

  const { data: studentByEmail, error: studentByEmailError } = await supabaseAdmin
    .from("students")
    .select("id, tenant_id, name")
    .eq("tenant_id", defaultTenantId)
    .ilike("email", email)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (studentByEmailError) {
    throw new Error(`Failed to resolve student by email: ${studentByEmailError.message}`);
  }

  if (!studentByEmail) {
    throw new Error("Student context not found");
  }

  await supabaseAdmin
    .from("student_profiles")
    .update({
      tenant_id: studentByEmail.tenant_id,
      student_id: studentByEmail.id,
    })
    .eq("user_id", userId);

  return {
    userId,
    tenantId: studentByEmail.tenant_id,
    studentId: studentByEmail.id,
    studentName: studentByEmail.name || "Alumno",
  };
}

async function syncStudentGamificationState(
  context: StudentContext,
  certifications: Array<{
    candidate_id: string;
    exam_id: string;
    exam_name: string;
    final_grade: number | null;
  }>
): Promise<SyncGamificationResult> {
  const [enrollments, attendance] = await Promise.all([
    supabaseAdmin
      .from("enrollments")
      .select("id, created_at, confirmed_at, classes(name)")
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .eq("status", "confirmed"),
    supabaseAdmin
      .from("student_event_attendance")
      .select("id, created_at, events(name)")
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .eq("status", "confirmed"),
  ]);

  if (enrollments.error) {
    throw new Error(`Failed to sync class gamification events: ${enrollments.error.message}`);
  }

  if (attendance.error) {
    throw new Error(`Failed to sync event gamification events: ${attendance.error.message}`);
  }

  const passedCertifications = certifications.filter(
    (item) => typeof item.final_grade === "number" && item.final_grade >= 60
  );

  const classEvents = (enrollments.data ?? []).map((row) => {
    const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    return {
      tenant_id: context.tenantId,
      student_id: context.studentId,
      user_id: context.userId,
      event_type: "class_completed" as const,
      source_table: "enrollments",
      source_id: row.id,
      xp_delta: XP_BY_EVENT_TYPE.class_completed,
      metadata: { label: `Clase completada: ${classRow?.name || "Clase"}` },
      occurred_at: row.confirmed_at || row.created_at,
    };
  });

  const eventAttendanceEvents = (attendance.data ?? []).map((row) => {
    const eventRow = Array.isArray(row.events) ? row.events[0] : row.events;
    return {
      tenant_id: context.tenantId,
      student_id: context.studentId,
      user_id: context.userId,
      event_type: "event_attended" as const,
      source_table: "student_event_attendance",
      source_id: row.id,
      xp_delta: XP_BY_EVENT_TYPE.event_attended,
      metadata: { label: `Evento asistido: ${eventRow?.name || "Evento"}` },
      occurred_at: row.created_at,
    };
  });

  const certificationEvents = passedCertifications.map((item) => ({
    tenant_id: context.tenantId,
    student_id: context.studentId,
    user_id: context.userId,
    event_type: "certification_passed" as const,
    source_table: "exam_candidates",
    source_id: `${item.candidate_id}:${item.exam_id}`,
    xp_delta: XP_BY_EVENT_TYPE.certification_passed,
    metadata: { label: `Certificacion aprobada: ${item.exam_name || "Examen"}` },
    occurred_at: new Date().toISOString(),
  }));

  const eventsToUpsert = [...classEvents, ...eventAttendanceEvents, ...certificationEvents];
  if (eventsToUpsert.length > 0) {
    const { error: upsertEventsError } = await supabaseAdmin
      .from("gamification_events")
      .upsert(eventsToUpsert, { onConflict: "tenant_id,student_id,event_type,source_table,source_id" });

    if (upsertEventsError) {
      throw new Error(`Failed to persist gamification events: ${upsertEventsError.message}`);
    }
  }

  const { data: ledgerRows, error: ledgerError } = await supabaseAdmin
    .from("gamification_events")
    .select("event_type, xp_delta")
    .eq("tenant_id", context.tenantId)
    .eq("student_id", context.studentId);

  if (ledgerError) {
    throw new Error(`Failed to load gamification events: ${ledgerError.message}`);
  }

  const classesCompleted = (ledgerRows ?? []).filter((row) => row.event_type === "class_completed").length;
  const eventsAttended = (ledgerRows ?? []).filter((row) => row.event_type === "event_attended").length;
  const certificationsPassed = (ledgerRows ?? []).filter((row) => row.event_type === "certification_passed").length;
  const xp = (ledgerRows ?? []).reduce((sum, row) => sum + (row.xp_delta ?? 0), 0);
  const levelNumber = Math.max(1, Math.floor(xp / 1000) + 1);
  const xpToNextLevel = levelNumber * 1000;

  const { data: definitions, error: definitionsError } = await supabaseAdmin
    .from("achievements_definitions")
    .select("id, title, category, metric_key, threshold_value, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (definitionsError) {
    throw new Error(`Failed to load achievement definitions: ${definitionsError.message}`);
  }

  const typedDefinitions = (definitions ?? []) as AchievementDefinitionRow[];

  const metricValue = (metricKey: AchievementDefinitionRow["metric_key"]) => {
    if (metricKey === "class_completed_count") return classesCompleted;
    if (metricKey === "event_attended_count") return eventsAttended;
    if (metricKey === "certification_passed_count") return certificationsPassed;
    return xp;
  };

  const { data: earnedBeforeRows, error: earnedBeforeError } = await supabaseAdmin
    .from("user_achievements")
    .select("achievement_id")
    .eq("tenant_id", context.tenantId)
    .eq("student_id", context.studentId);

  if (earnedBeforeError) {
    throw new Error(`Failed to load earned achievements baseline: ${earnedBeforeError.message}`);
  }

  const earnedBeforeSet = new Set((earnedBeforeRows ?? []).map((row) => row.achievement_id as string));

  const earnedRows = typedDefinitions
    .map((definition) => {
      const progressValue = metricValue(definition.metric_key);
      if (progressValue < definition.threshold_value) {
        return null;
      }

      return {
        tenant_id: context.tenantId,
        student_id: context.studentId,
        achievement_id: definition.id,
        progress_value: progressValue,
        metadata: {
          metricKey: definition.metric_key,
          thresholdValue: definition.threshold_value,
        },
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (earnedRows.length > 0) {
    const { error: upsertAchievementsError } = await supabaseAdmin
      .from("user_achievements")
      .upsert(earnedRows, { onConflict: "tenant_id,student_id,achievement_id" });

    if (upsertAchievementsError) {
      throw new Error(`Failed to persist earned achievements: ${upsertAchievementsError.message}`);
    }

    const newlyUnlocked = typedDefinitions.filter(
      (definition) =>
        earnedRows.some((earned) => earned.achievement_id === definition.id)
        && !earnedBeforeSet.has(definition.id)
    );

    await Promise.all(
      newlyUnlocked.map((definition) =>
        createPortalNotification({
          tenantId: context.tenantId,
          userId: context.userId,
          type: PORTAL_NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED,
          title: "Logro desbloqueado",
          message: `Conseguiste el logro: ${definition.title}`,
          actionUrl: "/portal/app/progress",
          metadata: {
            achievementId: definition.id,
            category: definition.category,
            thresholdValue: definition.threshold_value,
          },
        })
      )
    );
  }

  const { data: earnedDefinitions, error: earnedError } = await supabaseAdmin
    .from("user_achievements")
    .select("achievement_id")
    .eq("tenant_id", context.tenantId)
    .eq("student_id", context.studentId);

  if (earnedError) {
    throw new Error(`Failed to load earned achievements: ${earnedError.message}`);
  }

  const earnedSet = new Set((earnedDefinitions ?? []).map((row) => row.achievement_id as string));
  const achievements = typedDefinitions.map((definition) => ({
    id: definition.id,
    title: definition.title,
    category: definition.category,
    earned: earnedSet.has(definition.id),
  }));

  return {
    classesCompleted,
    eventsAttended,
    passedCertifications: certificationsPassed,
    xp,
    levelNumber,
    xpToNextLevel,
    achievements,
    nextAchievements: achievements.filter((item) => !item.earned),
  };
}

export const studentPortalService = {
  async getContext(userId: string) {
    return resolveStudentContext(userId);
  },

  async getStudentClasses(userId: string) {
    const context = await resolveStudentContext(userId);

    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("id, status, class_id, created_at, classes(id, name, discipline_id, category_id, room_id, teacher_id, capacity, price_cents, class_schedules(id, weekday, start_time, end_time), rooms(name), teachers(name))")
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list student classes: ${error.message}`);
    }

    const classes = (data ?? [])
      .map((row) => {
        const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
        if (!classRow) return null;

        const schedules = Array.isArray(classRow.class_schedules) ? classRow.class_schedules : [];
        const firstSchedule = schedules[0] || null;
        const room = Array.isArray(classRow.rooms) ? classRow.rooms[0] : classRow.rooms;
        const teacher = Array.isArray(classRow.teachers) ? classRow.teachers[0] : classRow.teachers;

        return {
          enrollmentId: row.id,
          classId: classRow.id,
          status: row.status,
          name: classRow.name,
          day: weekdayLabel(firstSchedule?.weekday ?? null),
          time: formatTimeRange(firstSchedule?.start_time, firstSchedule?.end_time),
          room: room?.name || "Sin sala",
          teacher: teacher?.name || "Sin profesor",
          style: classRow.discipline_id || "General",
          level: classRow.category_id || "Todos",
          capacity: classRow.capacity,
          monthlyPrice: Math.round((classRow.price_cents || 0) / 100),
          schedules: schedules.map((schedule) => ({
            id: schedule.id,
            weekday: schedule.weekday,
            day: weekdayLabel(schedule.weekday),
            startTime: schedule.start_time,
            endTime: schedule.end_time,
          })),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      student: {
        id: context.studentId,
        name: context.studentName,
      },
      classes,
    };
  },

  async getStudentSchedule(userId: string) {
    const classes = await this.getStudentClasses(userId);

    const weeklySchedule = classes.classes
      .flatMap((classItem) =>
        classItem.schedules.map((schedule) => ({
          classId: classItem.classId,
          className: classItem.name,
          day: schedule.day,
          weekday: schedule.weekday,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          room: classItem.room,
          teacher: classItem.teacher,
        }))
      )
      .sort((a, b) => {
        if (a.weekday !== b.weekday) return a.weekday - b.weekday;
        return a.startTime.localeCompare(b.startTime);
      });

    return {
      student: classes.student,
      weeklySchedule,
    };
  },

  async getStudentEnrollments(userId: string, input: ListPaginationInput) {
    const context = await resolveStudentContext(userId);

    const { data, error, count } = await supabaseAdmin
      .from("enrollments")
      .select("id, class_id, status, payment_status, payment_method, created_at, confirmed_at, notes, classes(name, discipline_id, price_cents)", { count: "exact" })
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      throw new Error(`Failed to list enrollments: ${error.message}`);
    }

    return {
      items: (data ?? []).map((row) => {
        const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
        return {
          id: row.id,
          classId: row.class_id,
          className: classRow?.name || "Clase",
          discipline: classRow?.discipline_id || null,
          price: Math.round(((classRow?.price_cents || 0) as number) / 100),
          status: row.status,
          paymentStatus: row.payment_status,
          paymentMethod: row.payment_method || null,
          confirmedAt: row.confirmed_at,
          createdAt: row.created_at,
          notes: row.notes || null,
        };
      }),
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async getStudentAttendanceStats(userId: string) {
    const context = await resolveStudentContext(userId);

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartIso = monthStart.toISOString().slice(0, 10);

    const { count: absencesCount } = await supabaseAdmin
      .from("student_incidents")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .eq("type", "absence");

    const { count: absencesThisMonthCount } = await supabaseAdmin
      .from("student_incidents")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .eq("type", "absence")
      .gte("start_date", monthStartIso);

    const totalAbsences = absencesCount ?? 0;
    const absencesThisMonth = absencesThisMonthCount ?? 0;
    const attendanceRate = Math.max(0, Math.min(100, 100 - totalAbsences * 5));
    const streak = Math.max(0, 30 - absencesThisMonth * 3);

    return {
      attendanceRate,
      totalAbsences,
      absencesThisMonth,
      currentStreakDays: streak,
    };
  },

  async getStudentProgress(userId: string) {
    const context = await resolveStudentContext(userId);
    const certifications = await examSuiteService
      .getStudentCertificationHistory(context.tenantId, context.studentId)
      .catch(() => []);
    const progress = await syncStudentGamificationState(context, certifications);
    const attendance = await this.getStudentAttendanceStats(userId);

    return {
      classesCompleted: progress.classesCompleted,
      eventsAttended: progress.eventsAttended,
      passedCertifications: progress.passedCertifications,
      xp: progress.xp,
      levelNumber: progress.levelNumber,
      xpToNextLevel: progress.xpToNextLevel,
      attendanceRate: attendance.attendanceRate,
      currentStreakDays: attendance.currentStreakDays,
      achievements: progress.achievements,
      nextAchievements: progress.nextAchievements,
    };
  },

  async getStudentXpHistory(userId: string, input: ListPaginationInput) {
    const context = await resolveStudentContext(userId);

    const certifications = await examSuiteService
      .getStudentCertificationHistory(context.tenantId, context.studentId)
      .catch(() => []);
    await syncStudentGamificationState(context, certifications);

    const { data, error, count } = await supabaseAdmin
      .from("gamification_events")
      .select("id, event_type, xp_delta, metadata, occurred_at", { count: "exact" })
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .order("occurred_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      throw new Error(`Failed to fetch student XP history: ${error.message}`);
    }

    const allItems = ((data ?? []) as GamificationEventRow[]).map((row) => {
      const fallbackLabel =
        row.event_type === "class_completed"
          ? "Clase completada"
          : row.event_type === "event_attended"
            ? "Evento asistido"
            : "Certificacion aprobada";

      const metadata = row.metadata ?? {};
      const rawLabel = typeof metadata.label === "string" ? metadata.label : null;

      return {
        id: row.id,
        type: row.event_type,
        label: rawLabel ?? fallbackLabel,
        xpDelta: row.xp_delta,
        createdAt: row.occurred_at,
      };
    });

    return {
      items: allItems,
      total: count ?? allItems.length,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async getStudentCertifications(userId: string) {
    const context = await resolveStudentContext(userId);
    const history = await examSuiteService
      .getStudentCertificationHistory(context.tenantId, context.studentId)
      .catch(() => []);

    return history.map((item) => ({
      candidateId: item.candidate_id,
      examId: item.exam_id,
      examName: item.exam_name,
      discipline: item.discipline,
      level: item.level,
      examDate: item.exam_date,
      finalGrade: item.final_grade,
      comments: item.comments,
      certificateUrl: item.certificate_file_url,
      certificateGeneratedAt: item.generated_at,
      status:
        typeof item.final_grade === "number"
          ? item.final_grade >= 60
            ? "passed"
            : "failed"
          : "pending",
    }));
  },

  async listStudentEvents(userId: string, input: ListStudentEventsInput) {
    const context = await resolveStudentContext(userId);

    let query = supabaseAdmin
      .from("events")
      .select("id, tenant_id, name, start_date, end_date, location, description, status", { count: "exact" })
      .eq("tenant_id", context.tenantId)
      .eq("status", "published")
      .order("start_date", { ascending: true })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.upcomingOnly) {
      query = query.gte("start_date", new Date().toISOString().slice(0, 10));
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list student events: ${error.message}`);
    }

    const eventRows = data ?? [];
    const eventIds = eventRows.map((event) => event.id);

    let attendedSet = new Set<string>();
    if (eventIds.length > 0) {
      const { data: attendanceRows } = await supabaseAdmin
        .from("student_event_attendance")
        .select("event_id")
        .eq("tenant_id", context.tenantId)
        .eq("student_id", context.studentId)
        .eq("status", "confirmed")
        .in("event_id", eventIds);

      attendedSet = new Set((attendanceRows ?? []).map((row) => row.event_id as string));
    }

    return {
      items: eventRows.map((event) => ({
        id: event.id,
        tenantId: event.tenant_id,
        name: event.name,
        startDate: event.start_date,
        endDate: event.end_date,
        location: event.location,
        description: event.description,
        status: event.status,
        attended: attendedSet.has(event.id),
      })),
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async confirmEventAttendance(userId: string, eventId: string) {
    const context = await resolveStudentContext(userId);

    const { data: eventRow, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, name, start_date")
      .eq("tenant_id", context.tenantId)
      .eq("id", eventId)
      .eq("status", "published")
      .maybeSingle();

    if (eventError || !eventRow) {
      throw new Error("Event not found");
    }

    const { error } = await supabaseAdmin
      .from("student_event_attendance")
      .upsert(
        {
          tenant_id: context.tenantId,
          student_id: context.studentId,
          event_id: eventId,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,student_id,event_id" }
      );

    if (error) {
      throw new Error(`Failed to confirm attendance: ${error.message}`);
    }

    await createPortalNotification({
      tenantId: context.tenantId,
      userId: context.userId,
      type: PORTAL_NOTIFICATION_TYPES.EVENT_ATTENDANCE_CONFIRMED,
      title: "Asistencia confirmada",
      message: `Tu asistencia a ${eventRow.name || "el evento"} quedo confirmada.`,
      actionUrl: "/portal/app/events",
      metadata: {
        eventId,
        eventName: eventRow.name,
        startDate: eventRow.start_date,
      },
    });

    const eventDate = new Date(`${eventRow.start_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(today);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    if (eventDate >= today && eventDate <= tomorrowEnd) {
      await createPortalNotification({
        tenantId: context.tenantId,
        userId: context.userId,
        type: PORTAL_NOTIFICATION_TYPES.EVENT_UPCOMING_24H,
        title: "Evento cercano",
        message: `${eventRow.name || "Tu evento"} es en menos de 24 horas.`,
        actionUrl: "/portal/app/events",
        metadata: {
          eventId,
          eventName: eventRow.name,
          startDate: eventRow.start_date,
        },
      });
    }

    return { success: true };
  },

  async cancelEventAttendance(userId: string, eventId: string) {
    const context = await resolveStudentContext(userId);

    const { error } = await supabaseAdmin
      .from("student_event_attendance")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .eq("event_id", eventId);

    if (error) {
      throw new Error(`Failed to cancel attendance: ${error.message}`);
    }

    return { success: true };
  },

  async listEventParticipations(userId: string, input: ListPaginationInput) {
    const context = await resolveStudentContext(userId);

    const { data, error, count } = await supabaseAdmin
      .from("student_event_attendance")
      .select("id, event_id, status, confirmed_at, created_at, events(name, start_date, location)", { count: "exact" })
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      throw new Error(`Failed to list event participations: ${error.message}`);
    }

    return {
      items: (data ?? []).map((row) => {
        const eventRow = Array.isArray(row.events) ? row.events[0] : row.events;
        return {
          id: row.id,
          eventId: row.event_id,
          status: row.status,
          eventName: eventRow?.name || "Evento",
          eventDate: eventRow?.start_date || null,
          eventLocation: eventRow?.location || null,
          confirmedAt: row.confirmed_at,
          createdAt: row.created_at,
        };
      }),
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async listStudentPayments(userId: string, input: ListPaginationInput) {
    const context = await resolveStudentContext(userId);

    const { data, error, count } = await supabaseAdmin
      .from("payments")
      .select(
        "id, enrollment_id, amount_cents, currency, status, provider, paid_at, due_at, metadata, created_at, enrollments(class_id, classes(name))",
        { count: "exact" }
      )
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      throw new Error(`Failed to list student payments: ${error.message}`);
    }

    const paymentIds = (data ?? []).map((row) => row.id as string);
    let receiptRows: Array<{ payment_id: string; id: string; receipt_number: string }> = [];

    if (paymentIds.length > 0) {
      const { data: receiptsData, error: receiptsError } = await supabaseAdmin
        .from("receipts")
        .select("id, payment_id, receipt_number")
        .eq("tenant_id", context.tenantId)
        .in("payment_id", paymentIds);

      if (receiptsError) {
        throw new Error(`Failed to list student receipts: ${receiptsError.message}`);
      }

      receiptRows = (receiptsData ?? []) as Array<{ payment_id: string; id: string; receipt_number: string }>;
    }

    const receiptByPaymentId = new Map(receiptRows.map((row) => [row.payment_id, row]));

    const items: StudentPortalPaymentItem[] = (data ?? []).map((row) => {
      const enrollment = Array.isArray(row.enrollments) ? row.enrollments[0] : row.enrollments;
      const classRow = enrollment?.classes ? (Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes) : null;
      const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
      const receipt = receiptByPaymentId.get(row.id as string);

      return {
        id: row.id,
        enrollmentId: row.enrollment_id,
        className: classRow?.name || "Clase",
        concept: typeof metadata.invoice_number === "string" ? `Factura ${metadata.invoice_number}` : `Mensualidad - ${classRow?.name || "Clase"}`,
        amountCents: row.amount_cents || 0,
        amount: Math.round((row.amount_cents || 0) / 100),
        currency: row.currency || "EUR",
        status: row.status || "pending",
        provider: row.provider || "manual",
        paidAt: row.paid_at,
        dueAt: row.due_at,
        createdAt: row.created_at,
        receiptId: receipt?.id || null,
        receiptNumber: receipt?.receipt_number || null,
        checkoutAvailable: (row.status === "pending" || row.status === "overdue") && (row.amount_cents || 0) > 0,
      };
    });

    return {
      items,
      total: count ?? items.length,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async getStudentReceiptText(userId: string, paymentId: string) {
    const context = await resolveStudentContext(userId);

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("id, amount_cents, currency, status, paid_at, due_at, created_at, provider, metadata, enrollments(classes(name))")
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .eq("id", paymentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load payment receipt: ${error.message}`);
    }

    if (!payment) {
      throw new Error("Payment not found");
    }

    const { data: receipt } = await supabaseAdmin
      .from("receipts")
      .select("id, receipt_number, issued_at")
      .eq("tenant_id", context.tenantId)
      .eq("payment_id", paymentId)
      .maybeSingle();

    const enrollment = Array.isArray(payment.enrollments) ? payment.enrollments[0] : payment.enrollments;
    const classRow = enrollment?.classes ? (Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes) : null;
    const metadata = payment.metadata && typeof payment.metadata === "object" ? (payment.metadata as Record<string, unknown>) : {};
    const concept = typeof metadata.invoice_number === "string" ? `Factura ${metadata.invoice_number}` : `Mensualidad - ${classRow?.name || "Clase"}`;

    const lines = [
      "RECIBO DE PAGO - DANCE SCHOOL HUB",
      "",
      `Alumno: ${context.studentName}`,
      `Concepto: ${concept}`,
      `Importe: ${Math.round((payment.amount_cents || 0) / 100)} ${payment.currency || "EUR"}`,
      `Estado: ${payment.status || "pending"}`,
      `Metodo: ${payment.provider || "manual"}`,
      `Fecha de pago: ${payment.paid_at || "-"}`,
      `Fecha de vencimiento: ${payment.due_at || "-"}`,
      `Recibo N.: ${receipt?.receipt_number || "No generado"}`,
      `Emitido: ${receipt?.issued_at || payment.created_at}`,
    ];

    return {
      fileName: `recibo-${payment.id}.txt`,
      content: lines.join("\n"),
    };
  },

  async createEnrollmentCheckoutSession(
    userId: string,
    enrollmentId: string,
    input: { successUrl?: string; cancelUrl?: string; fallbackBaseUrl: string }
  ) {
    const context = await resolveStudentContext(userId);

    const { data: enrollment, error } = await supabaseAdmin
      .from("enrollments")
      .select("id, class_id, status, classes(name, price_cents)")
      .eq("tenant_id", context.tenantId)
      .eq("student_id", context.studentId)
      .eq("id", enrollmentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load enrollment checkout data: ${error.message}`);
    }

    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    const classRow = enrollment.classes ? (Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes) : null;
    const amountCents = classRow?.price_cents || 0;

    if (amountCents <= 0) {
      throw new Error("Enrollment has no payable amount");
    }

    if (!stripeService.isConfigured()) {
      throw new Error("Stripe is not configured");
    }

    const successUrl = input.successUrl || `${input.fallbackBaseUrl}/portal/app/finance?checkout=success`;
    const cancelUrl = input.cancelUrl || `${input.fallbackBaseUrl}/portal/app/finance?checkout=cancelled`;

    const session = await stripeService.createCheckoutSession({
      amountCents,
      currency: "EUR",
      description: `Matricula ${classRow?.name || "Clase"}`,
      successUrl,
      cancelUrl,
      metadata: {
        tenant_id: context.tenantId,
        student_id: context.studentId,
        enrollment_id: enrollment.id,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
      amountCents,
    };
  },

  async getStudentCalendarData(userId: string) {
    const context = await resolveStudentContext(userId);
    const schedule = await this.getStudentSchedule(userId);
    const events = await this.listStudentEvents(userId, { limit: 100, offset: 0, upcomingOnly: false });

    return {
      tenantId: context.tenantId,
      student: schedule.student,
      weeklySchedule: schedule.weeklySchedule,
      events: events.items,
    };
  },

  async getStudentActivityHistory(userId: string, input: ListPaginationInput) {
    const [xpHistory, participations, enrollments] = await Promise.all([
      this.getStudentXpHistory(userId, { limit: 100, offset: 0 }),
      this.listEventParticipations(userId, { limit: 100, offset: 0 }),
      this.getStudentEnrollments(userId, { limit: 100, offset: 0 }),
    ]);

    const items = [
      ...xpHistory.items.map((item) => ({
        id: `xp-${item.id}`,
        type: "xp",
        title: item.label,
        details: `${item.xpDelta > 0 ? "+" : ""}${item.xpDelta} XP`,
        createdAt: item.createdAt,
      })),
      ...participations.items.map((item) => ({
        id: `event-${item.id}`,
        type: "event",
        title: item.eventName,
        details: item.status,
        createdAt: item.confirmedAt || item.createdAt,
      })),
      ...enrollments.items.map((item) => ({
        id: `enrollment-${item.id}`,
        type: "enrollment",
        title: item.className,
        details: item.status,
        createdAt: item.confirmedAt || item.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const start = input.offset;
    const end = input.offset + input.limit;

    return {
      items: items.slice(start, end),
      total: items.length,
      limit: input.limit,
      offset: input.offset,
    };
  },
};
