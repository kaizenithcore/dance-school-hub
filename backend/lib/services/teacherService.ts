import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { CreateTeacherInput, UpdateTeacherInput } from "@/lib/validators/teacherSchemas";

export interface Teacher {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  salary: number;
  status: string;
  created_at: string;
  updated_at: string;
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

    return data ?? [];
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

    return data;
  },

  async createTeacher(tenantId: string, input: CreateTeacherInput): Promise<Teacher> {
    const { data, error } = await supabaseAdmin
      .from("teachers")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        bio: input.bio ?? null,
        salary: input.salary ?? 0,
        status: input.status ?? "active",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create teacher: ${error.message}`);
    }

    return data;
  },

  async updateTeacher(
    tenantId: string,
    teacherId: string,
    input: UpdateTeacherInput
  ): Promise<Teacher> {
    const { data, error } = await supabaseAdmin
      .from("teachers")
      .update({
        name: input.name,
        email: input.email,
        phone: input.phone,
        bio: input.bio,
        salary: input.salary,
        status: input.status,
      })
      .eq("tenant_id", tenantId)
      .eq("id", teacherId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update teacher: ${error.message}`);
    }

    return data;
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
