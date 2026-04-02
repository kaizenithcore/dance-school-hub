import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { CreateClassInput, UpdateClassInput } from "@/lib/validators/classSchemas";

export interface Class {
  id: string;
  tenant_id: string;
  name: string;
  discipline_id: string | null;
  category_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  capacity: number;
  weekly_frequency: number;
  price_cents: number;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  enrolled_count?: number;
  teachers?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  class_teachers?: Array<{
    teacher_id: string;
    teachers: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  }>;
}

async function getActiveEnrollmentCountByClassId(
  tenantId: string,
  classIds: string[]
): Promise<Map<string, number>> {
  const uniqueClassIds = Array.from(new Set(classIds.filter(Boolean)));
  const countByClassId = new Map<string, number>();

  if (uniqueClassIds.length === 0) {
    return countByClassId;
  }

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("class_id")
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "confirmed"])
    .in("class_id", uniqueClassIds);

  if (error) {
    throw new Error(`Failed to fetch class enrollments: ${error.message}`);
  }

  for (const row of data || []) {
    const classId = (row as { class_id?: string | null }).class_id;
    if (!classId) {
      continue;
    }
    countByClassId.set(classId, (countByClassId.get(classId) || 0) + 1);
  }

  return countByClassId;
}

function normalizeTeacherIds(input: CreateClassInput | UpdateClassInput): string[] {
  const fromArray = Array.isArray(input.teacher_ids) ? input.teacher_ids : [];
  const fromSingle = typeof input.teacher_id === "string" && input.teacher_id.length > 0 ? [input.teacher_id] : [];
  return Array.from(new Set([...fromArray, ...fromSingle]));
}

function isClassTeachersSchemaMissing(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return normalized.includes("class_teachers") && (normalized.includes("does not exist") || normalized.includes("relationship"));
}

async function syncClassTeachers(tenantId: string, classId: string, teacherIds: string[]) {
  const { error: deleteError } = await supabaseAdmin
    .from("class_teachers")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("class_id", classId);

  if (deleteError) {
    if (isClassTeachersSchemaMissing(deleteError.message)) {
      if (teacherIds.length > 1) {
        throw new Error("La base de datos no tiene la migración class_teachers. Ejecuta la migración de múltiples profesores.");
      }
      return;
    }
    throw new Error(`Failed to sync class teachers: ${deleteError.message}`);
  }

  if (teacherIds.length === 0) {
    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from("class_teachers")
    .insert(
      teacherIds.map((teacherId) => ({
        tenant_id: tenantId,
        class_id: classId,
        teacher_id: teacherId,
      }))
    );

  if (insertError) {
    throw new Error(`Failed to sync class teachers: ${insertError.message}`);
  }
}

function mapTeacherRows(item: Class): Array<{ id: string; name: string }> {
  if (Array.isArray(item.class_teachers) && item.class_teachers.length > 0) {
    return item.class_teachers
      .map((row) => (Array.isArray(row.teachers) ? row.teachers[0] : row.teachers))
      .filter((teacher): teacher is { id: string; name: string } => Boolean(teacher?.id && teacher?.name));
  }

  const singleTeacher = Array.isArray(item.teachers) ? item.teachers[0] : item.teachers;
  return singleTeacher?.id && singleTeacher?.name ? [singleTeacher] : [];
}

async function getClassWithTeachers(tenantId: string, classId: string): Promise<Class> {
  let data: Class | null = null;
  let error: { message: string } | null = null;

  const withJoin = await supabaseAdmin
    .from("classes")
    .select("*, class_teachers(teacher_id, teachers(id, name))")
    .eq("tenant_id", tenantId)
    .eq("id", classId)
    .single();

  data = withJoin.data as Class | null;
  error = withJoin.error as { message: string } | null;

  if (error && isClassTeachersSchemaMissing(error.message)) {
    const legacy = await supabaseAdmin
      .from("classes")
      .select("*, teachers(id, name)")
      .eq("tenant_id", tenantId)
      .eq("id", classId)
      .single();

    data = legacy.data as Class | null;
    error = legacy.error as { message: string } | null;
  }

  if (error || !data) {
    throw new Error(`Failed to fetch class: ${error?.message || "Class not found"}`);
  }

  const activeEnrollmentCountByClassId = await getActiveEnrollmentCountByClassId(tenantId, [classId]);
  const teacherRows = mapTeacherRows(data as Class);
  return {
    ...(data as Class),
    enrolled_count: activeEnrollmentCountByClassId.get(classId) || 0,
    teachers: teacherRows,
  };
}

export const classService = {
  async listClasses(tenantId: string): Promise<Class[]> {
    let data: Class[] | null = null;
    let error: { message: string } | null = null;

    const withJoin = await supabaseAdmin
      .from("classes")
      .select("*, class_teachers(teacher_id, teachers(id, name))")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    data = withJoin.data as Class[] | null;
    error = withJoin.error as { message: string } | null;

    if (error && isClassTeachersSchemaMissing(error.message)) {
      const legacy = await supabaseAdmin
        .from("classes")
        .select("*, teachers(id, name)")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      data = legacy.data as Class[] | null;
      error = legacy.error as { message: string } | null;
    }

    if (error) {
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }

    const classIds = (data ?? []).map((item) => item.id);
    const activeEnrollmentCountByClassId = await getActiveEnrollmentCountByClassId(tenantId, classIds);

    return (data ?? []).map((item) => {
      const teacherRows = mapTeacherRows(item as Class);
      return {
        ...(item as Class),
        enrolled_count: activeEnrollmentCountByClassId.get(item.id) || 0,
        teachers: teacherRows,
      };
    });
  },

  async getClass(tenantId: string, classId: string): Promise<Class | null> {
    const { data, error } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", classId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch class: ${error.message}`);
    }

    return getClassWithTeachers(tenantId, data.id);
  },

  async createClass(
    tenantId: string,
    userId: string,
    input: CreateClassInput
  ): Promise<Class> {
    const teacherIds = normalizeTeacherIds(input);
    const primaryTeacherId = teacherIds[0] ?? null;

    const { data, error } = await supabaseAdmin
      .from("classes")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        discipline_id: input.discipline_id ?? null,
        category_id: input.category_id ?? null,
        teacher_id: primaryTeacherId,
        room_id: input.room_id ?? null,
        capacity: input.capacity,
        weekly_frequency: input.weekly_frequency ?? 1,
        price_cents: input.price_cents,
        description: input.description ?? null,
        status: input.status ?? "active",
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create class: ${error.message}`);
    }

    await syncClassTeachers(tenantId, data.id, teacherIds);
    return getClassWithTeachers(tenantId, data.id);
  },

  async updateClass(
    tenantId: string,
    classId: string,
    input: UpdateClassInput
  ): Promise<Class> {
    const teacherIds = normalizeTeacherIds(input);
    const primaryTeacherId = teacherIds[0] ?? null;

    const { data, error } = await supabaseAdmin
      .from("classes")
      .update({
        name: input.name,
        discipline_id: input.discipline_id,
        category_id: input.category_id,
        teacher_id: input.teacher_ids !== undefined || input.teacher_id !== undefined ? primaryTeacherId : undefined,
        room_id: input.room_id,
        capacity: input.capacity,
        weekly_frequency: input.weekly_frequency,
        price_cents: input.price_cents,
        description: input.description,
        status: input.status,
      })
      .eq("tenant_id", tenantId)
      .eq("id", classId)
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to update class: ${error.message}`);
    }

    if (input.teacher_ids !== undefined || input.teacher_id !== undefined) {
      await syncClassTeachers(tenantId, classId, teacherIds);
    }

    return getClassWithTeachers(tenantId, data.id);
  },

  async deleteClass(tenantId: string, classId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("classes")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", classId);

    if (error) {
      throw new Error(`Failed to delete class: ${error.message}`);
    }
  },
};
