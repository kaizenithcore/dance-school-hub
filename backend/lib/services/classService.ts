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
}

export const classService = {
  async listClasses(tenantId: string): Promise<Class[]> {
    const { data, error } = await supabaseAdmin
      .from("classes")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }

    return data ?? [];
  },

  async getClass(tenantId: string, classId: string): Promise<Class | null> {
    const { data, error } = await supabaseAdmin
      .from("classes")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", classId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch class: ${error.message}`);
    }

    return data;
  },

  async createClass(
    tenantId: string,
    userId: string,
    input: CreateClassInput
  ): Promise<Class> {
    const { data, error } = await supabaseAdmin
      .from("classes")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        discipline_id: input.discipline_id ?? null,
        category_id: input.category_id ?? null,
        teacher_id: input.teacher_id ?? null,
        room_id: input.room_id ?? null,
        capacity: input.capacity,
        weekly_frequency: input.weekly_frequency ?? 1,
        price_cents: input.price_cents,
        description: input.description ?? null,
        status: input.status ?? "active",
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create class: ${error.message}`);
    }

    return data;
  },

  async updateClass(
    tenantId: string,
    classId: string,
    input: UpdateClassInput
  ): Promise<Class> {
    const { data, error } = await supabaseAdmin
      .from("classes")
      .update({
        name: input.name,
        discipline_id: input.discipline_id,
        category_id: input.category_id,
        teacher_id: input.teacher_id,
        room_id: input.room_id,
        capacity: input.capacity,
        weekly_frequency: input.weekly_frequency,
        price_cents: input.price_cents,
        description: input.description,
        status: input.status,
      })
      .eq("tenant_id", tenantId)
      .eq("id", classId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update class: ${error.message}`);
    }

    return data;
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
