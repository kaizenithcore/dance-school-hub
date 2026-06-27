import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

interface ClassRow {
  id: string;
  name: string;
  discipline_id: string | null;
  category_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  capacity: number;
  price_cents: number;
  description: string | null;
  status: string;
  weekly_frequency: number;
}

interface ScheduleRow {
  id: string;
  class_id: string;
  room_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  recurrence: Record<string, unknown> | null;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
}

interface ClassTeacherRow {
  class_id: string;
  teacher_id: string;
}

export interface ClonePreview {
  sourceYearId: string;
  targetYearId: string;
  classCount: number;
  scheduleCount: number;
  sampleNames: string[];
}

export interface CloneResult {
  classesCloned: number;
  schedulesCloned: number;
  classNames: string[];
}

export const courseCloneService = {
  async preview(tenantId: string, sourceYearId: string, targetYearId: string): Promise<ClonePreview> {
    const { data: classes, error } = await supabaseAdmin
      .from("classes")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("academic_year_id", sourceYearId)
      .eq("status", "active")
      .order("name");

    if (error) throw new Error(`Failed to load source classes: ${error.message}`);

    const classIds = (classes || []).map((c) => c.id as string);

    const { data: schedules } = await supabaseAdmin
      .from("class_schedules")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("class_id", classIds.length > 0 ? classIds : ["__none__"]);

    return {
      sourceYearId,
      targetYearId,
      classCount: classIds.length,
      scheduleCount: (schedules || []).length,
      sampleNames: (classes || []).slice(0, 5).map((c) => c.name as string),
    };
  },

  async cloneYear(input: {
    tenantId: string;
    actorUserId: string;
    sourceYearId: string;
    targetYearId: string;
  }): Promise<CloneResult> {
    // 1. Verify target year exists for this tenant
    const { data: targetYear, error: yearErr } = await supabaseAdmin
      .from("academic_years")
      .select("id, display_name")
      .eq("id", input.targetYearId)
      .eq("tenant_id", input.tenantId)
      .single();
    if (yearErr || !targetYear) throw new Error("El curso de destino no existe o no pertenece a esta escuela");

    // 2. Load source classes
    const { data: sourceClasses, error: classErr } = await supabaseAdmin
      .from("classes")
      .select("id, name, discipline_id, category_id, teacher_id, room_id, capacity, price_cents, description, status, weekly_frequency")
      .eq("tenant_id", input.tenantId)
      .eq("academic_year_id", input.sourceYearId);
    if (classErr) throw new Error(`Error al leer clases del curso origen: ${classErr.message}`);

    if (!sourceClasses || sourceClasses.length === 0) {
      throw new Error("El curso origen no tiene clases. Asegúrate de que el curso seleccionado tiene clases con año académico asignado.");
    }

    // 3. Load class_teachers for source classes
    const sourceClassIds = sourceClasses.map((c) => c.id as string);
    const { data: classTeachers } = await supabaseAdmin
      .from("class_teachers")
      .select("class_id, teacher_id")
      .eq("tenant_id", input.tenantId)
      .in("class_id", sourceClassIds);

    const teachersByClass = new Map<string, string[]>();
    ((classTeachers || []) as ClassTeacherRow[]).forEach(({ class_id, teacher_id }) => {
      const existing = teachersByClass.get(class_id) || [];
      existing.push(teacher_id);
      teachersByClass.set(class_id, existing);
    });

    // 4. Load schedules for source classes
    const { data: sourceSchedules } = await supabaseAdmin
      .from("class_schedules")
      .select("id, class_id, room_id, weekday, start_time, end_time, recurrence, is_active, effective_from, effective_to")
      .eq("tenant_id", input.tenantId)
      .in("class_id", sourceClassIds);

    // 5. Check for name conflicts in target year
    const { data: existingNames } = await supabaseAdmin
      .from("classes")
      .select("name")
      .eq("tenant_id", input.tenantId)
      .eq("academic_year_id", input.targetYearId);
    const takenNames = new Set((existingNames || []).map((c) => c.name as string));

    // 6. Clone classes
    const classIdMap = new Map<string, string>(); // old id → new id
    const clonedNames: string[] = [];

    for (const src of sourceClasses as ClassRow[]) {
      let candidateName = src.name;
      let suffix = 2;
      while (takenNames.has(candidateName)) {
        candidateName = `${src.name} (${suffix})`;
        suffix++;
      }
      takenNames.add(candidateName);

      const { data: newClass, error: insertErr } = await supabaseAdmin
        .from("classes")
        .insert({
          tenant_id: input.tenantId,
          name: candidateName,
          discipline_id: src.discipline_id,
          category_id: src.category_id,
          teacher_id: src.teacher_id,
          room_id: src.room_id,
          capacity: src.capacity,
          price_cents: src.price_cents,
          description: src.description,
          status: src.status,
          weekly_frequency: src.weekly_frequency,
          academic_year_id: input.targetYearId,
          created_by: input.actorUserId,
        })
        .select("id")
        .single();

      if (insertErr || !newClass) throw new Error(`Error al clonar clase ${src.name}: ${insertErr?.message}`);

      const newClassId = newClass.id as string;
      classIdMap.set(src.id, newClassId);
      clonedNames.push(candidateName);

      // Clone class_teachers
      const teachers = teachersByClass.get(src.id) || [];
      if (teachers.length > 0) {
        await supabaseAdmin.from("class_teachers").insert(
          teachers.map((tid) => ({ tenant_id: input.tenantId, class_id: newClassId, teacher_id: tid }))
        );
      }
    }

    // 7. Clone schedules (keep same weekday/time — admin can adjust after)
    const scheduleRows = ((sourceSchedules || []) as ScheduleRow[])
      .map((s) => {
        const newClassId = classIdMap.get(s.class_id);
        if (!newClassId) return null;
        return {
          tenant_id: input.tenantId,
          class_id: newClassId,
          room_id: s.room_id,
          weekday: s.weekday,
          start_time: s.start_time,
          end_time: s.end_time,
          recurrence: s.recurrence || { type: "weekly" },
          is_active: s.is_active,
          effective_from: s.effective_from,
          effective_to: s.effective_to,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    let schedulesCloned = 0;
    if (scheduleRows.length > 0) {
      const { error: schedErr } = await supabaseAdmin.from("class_schedules").insert(scheduleRows);
      if (schedErr) throw new Error(`Error al clonar horarios: ${schedErr.message}`);
      schedulesCloned = scheduleRows.length;
    }

    // 8. Audit log
    await supabaseAdmin.from("audit_log").insert({
      tenant_id: input.tenantId,
      actor_user_id: input.actorUserId,
      action: "course_clone_completed",
      entity_type: "academic_year",
      entity_id: input.targetYearId,
      metadata: {
        sourceYearId: input.sourceYearId,
        targetYearId: input.targetYearId,
        classesCloned: classIdMap.size,
        schedulesCloned,
      },
    }).catch(() => { /* non-critical */ });

    return {
      classesCloned: classIdMap.size,
      schedulesCloned,
      classNames: clonedNames,
    };
  },
};
