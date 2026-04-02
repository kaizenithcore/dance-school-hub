import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { CreateTeacherInput, UpdateTeacherInput } from "@/lib/validators/teacherSchemas";

export interface Teacher {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  salay: number;
  status: string;
  created_at: string;
  updated_at: string;
}

function isMissingAularyColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /column\s+"?aulary"?\s+does not exist/i.test(message);
}

function isMissingSalayColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /column\s+"?salay"?\s+does not exist/i.test(message);
}

export const teacherService = {
  async listTeachers(tenantId: string): Promise<Teacher[]> {
    const { data, error } = await supabaseAdmin
      .from("teachers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch teachers: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      ...row,
      salay: Number((row as Record<string, unknown>).salay ?? (row as Record<string, unknown>).aulary ?? 0),
    } as Teacher));
  },

  async getTeacher(tenantId: string, teacherId: string): Promise<Teacher | null> {
    const { data, error } = await supabaseAdmin
      .from("teachers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", teacherId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch teacher: ${error.message}`);
    }

    return {
      ...data,
      salay: Number((data as Record<string, unknown>).salay ?? (data as Record<string, unknown>).aulary ?? 0),
    } as Teacher;
  },

  async createTeacher(tenantId: string, input: CreateTeacherInput): Promise<Teacher> {
    const salaryValue = input.salay ?? input.aulary ?? 0;
    const basePayload = {
      tenant_id: tenantId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      bio: input.bio ?? null,
      salay: salaryValue,
      status: input.status ?? "active",
    };

    let { data, error } = await supabaseAdmin
      .from("teachers")
      .insert(basePayload)
      .select()
      .single();

    if (error && isMissingSalayColumnError(error)) {
      const fallbackLegacyColumn = await supabaseAdmin
        .from("teachers")
        .insert({
          tenant_id: tenantId,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          bio: input.bio ?? null,
          aulary: salaryValue,
          status: input.status ?? "active",
        })
        .select()
        .single();

      data = fallbackLegacyColumn.data;
      error = fallbackLegacyColumn.error;
    }

    if (error && isMissingAularyColumnError(error)) {
      const fallback = await supabaseAdmin
        .from("teachers")
        .insert({
          tenant_id: tenantId,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          bio: input.bio ?? null,
          status: input.status ?? "active",
        })
        .select()
        .single();

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw new Error(`Failed to create teacher: ${error.message}`);
    }

    return {
      ...data,
      salay: Number((data as Record<string, unknown>).salay ?? (data as Record<string, unknown>).aulary ?? 0),
    } as Teacher;
  },

  async updateTeacher(
    tenantId: string,
    teacherId: string,
    input: UpdateTeacherInput
  ): Promise<Teacher> {
    const existing = await this.getTeacher(tenantId, teacherId);
    if (!existing) {
      throw new Error("Teacher not found");
    }

    const payload: Record<string, unknown> = {};

    const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : value);
    const normalizeNullableText = (value: unknown) => {
      if (value === undefined || value === null) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
      return String(value);
    };

    if (input.name !== undefined && normalizeText(input.name) !== normalizeText(existing.name)) {
      payload.name = input.name;
    }

    if (input.email !== undefined && normalizeNullableText(input.email) !== normalizeNullableText(existing.email)) {
      payload.email = normalizeNullableText(input.email);
    }

    if (input.phone !== undefined && normalizeNullableText(input.phone) !== normalizeNullableText(existing.phone)) {
      payload.phone = normalizeNullableText(input.phone);
    }

    if (input.bio !== undefined && normalizeNullableText(input.bio) !== normalizeNullableText(existing.bio)) {
      payload.bio = normalizeNullableText(input.bio);
    }

    const nextSalary = input.salay ?? input.aulary;
    if (nextSalary !== undefined && Number(nextSalary) !== Number(existing.salay)) {
      payload.salay = nextSalary;
    }

    if (input.status !== undefined && input.status !== existing.status) {
      payload.status = input.status;
    }

    // If there are no effective changes, skip DB update and return current row.
    if (Object.keys(payload).length === 0) {
      return existing;
    }

    let { data, error } = await supabaseAdmin
      .from("teachers")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", teacherId)
      .select()
      .maybeSingle();

    if (error && isMissingSalayColumnError(error) && Object.prototype.hasOwnProperty.call(payload, "salay")) {
      const { salay, ...withoutSalay } = payload;
      const fallback = await supabaseAdmin
        .from("teachers")
        .update({
          ...withoutSalay,
          aulary: salay,
        })
        .eq("tenant_id", tenantId)
        .eq("id", teacherId)
        .select()
        .maybeSingle();

      data = fallback.data;
      error = fallback.error;
    }

    if (error && isMissingAularyColumnError(error) && Object.prototype.hasOwnProperty.call(payload, "aulary")) {
      const { aulary: _ignored, ...withoutAulary } = payload;
      const fallback = await supabaseAdmin
        .from("teachers")
        .update(withoutAulary)
        .eq("tenant_id", tenantId)
        .eq("id", teacherId)
        .select()
        .maybeSingle();

      data = fallback.data;
      error = fallback.error;
    }

    if (error && isMissingAularyColumnError(error) && Object.prototype.hasOwnProperty.call(payload, "salay")) {
      const { salay, ...withoutSalay } = payload;
      const fallback = await supabaseAdmin
        .from("teachers")
        .update({
          ...withoutSalay,
          aulary: salay,
        })
        .eq("tenant_id", tenantId)
        .eq("id", teacherId)
        .select()
        .maybeSingle();

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw new Error(`Failed to update teacher: ${error.message}`);
    }

    if (data) {
      if (typeof (data as Record<string, unknown>).salay !== "number") {
        const legacyAulary = Number((data as Record<string, unknown>).aulary ?? 0);
        (data as Record<string, unknown>).salay = legacyAulary;
      }
      return data;
    }

    const reloaded = await this.getTeacher(tenantId, teacherId);
    if (!reloaded) {
      throw new Error("Teacher not found");
    }

    return reloaded;
  },

  async deleteTeacher(tenantId: string, teacherId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("teachers")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", teacherId);

    if (error) {
      throw new Error(`Failed to delete teacher: ${error.message}`);
    }
  },
};
