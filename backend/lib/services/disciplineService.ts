import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { CreateDisciplineInput, UpdateDisciplineInput, CreateCategoryInput, UpdateCategoryInput } from "@/lib/validators/teacherSchemas";

export interface Discipline {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const disciplineService = {
  async listDisciplines(tenantId: string): Promise<Discipline[]> {
    const { data, error } = await supabaseAdmin
      .from("disciplines")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch disciplines: ${error.message}`);
    }

    return data ?? [];
  },

  async createDiscipline(tenantId: string, input: CreateDisciplineInput): Promise<Discipline> {
    const { data, error } = await supabaseAdmin
      .from("disciplines")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description ?? null,
        is_active: input.isActive ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create discipline: ${error.message}`);
    }

    return data;
  },

  async updateDiscipline(tenantId: string, disciplineId: string, input: UpdateDisciplineInput): Promise<Discipline> {
    const { data, error } = await supabaseAdmin
      .from("disciplines")
      .update({
        name: input.name,
        description: input.description,
        is_active: input.isActive,
      })
      .eq("tenant_id", tenantId)
      .eq("id", disciplineId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update discipline: ${error.message}`);
    }

    return data;
  },

  async deleteDiscipline(tenantId: string, disciplineId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("disciplines")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", disciplineId);

    if (error) {
      throw new Error(`Failed to delete discipline: ${error.message}`);
    }
  },
};

export const categoryService = {
  async listCategories(tenantId: string): Promise<Category[]> {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return data ?? [];
  },

  async createCategory(tenantId: string, input: CreateCategoryInput): Promise<Category> {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description ?? null,
        is_active: input.isActive ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return data;
  },

  async updateCategory(tenantId: string, categoryId: string, input: UpdateCategoryInput): Promise<Category> {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .update({
        name: input.name,
        description: input.description,
        is_active: input.isActive,
      })
      .eq("tenant_id", tenantId)
      .eq("id", categoryId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return data;
  },

  async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", categoryId);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  },
};
