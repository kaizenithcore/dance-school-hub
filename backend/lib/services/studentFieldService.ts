import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { StudentFieldInput, StudentFieldUpdateInput } from "@/lib/validators/studentFieldSchemas";

export type StudentFieldType = "text" | "number" | "date" | "select";

export interface SchoolStudentField {
  id: string;
  schoolId: string;
  key: string;
  label: string;
  type: StudentFieldType;
  required: boolean;
  visible: boolean;
  visibleInTable: boolean;
  createdAt: string;
}

const CORE_STUDENT_KEYS = new Set([
  "name",
  "email",
  "phone",
  "birthdate",
  "status",
  "paymentType",
  "payerType",
  "payerName",
  "payerEmail",
  "payerPhone",
  "preferredPaymentMethod",
  "accountNumber",
  "joinDate",
  "notes",
  "guardian",
  "classIds",
  "jointEnrollmentGroupId",
  "extra_data",
  "extraData",
]);

function toSnakeCase(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(source)) {
    const normalizedKey = toSnakeCase(key);
    if (!normalizedKey) {
      continue;
    }
    output[normalizedKey] = rawValue;
  }

  return output;
}

function isMissing(value: unknown) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function sanitizeByType(value: unknown, type: StudentFieldType): unknown {
  if (value == null) {
    return null;
  }

  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : String(value);
  }

  if (type === "date") {
    const text = String(value).trim();
    return text.length === 0 ? null : text;
  }

  return typeof value === "string" ? value.trim() : value;
}

export const studentFieldService = {
  async listFields(schoolId: string): Promise<SchoolStudentField[]> {
    const { data, error } = await supabaseAdmin
      .from("school_student_fields")
      .select("id, school_id, key, label, type, required, visible, visible_in_table, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch student fields: ${error.message}`);
    }

    return (data || []).map((field: any) => ({
      id: field.id,
      schoolId: field.school_id,
      key: field.key,
      label: field.label,
      type: field.type,
      required: Boolean(field.required),
      visible: Boolean(field.visible),
      visibleInTable: Boolean(field.visible_in_table),
      createdAt: field.created_at,
    }));
  },

  async createField(schoolId: string, input: StudentFieldInput): Promise<SchoolStudentField> {
    const key = toSnakeCase(input.key);
    const visibleInTable = input.visibleInTable ?? input.visible_in_table ?? false;
    const { data, error } = await supabaseAdmin
      .from("school_student_fields")
      .insert({
        school_id: schoolId,
        key,
        label: input.label.trim(),
        type: input.type,
        required: Boolean(input.required),
        visible: input.visible !== false,
        visible_in_table: Boolean(visibleInTable),
      })
      .select("id, school_id, key, label, type, required, visible, visible_in_table, created_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create student field: ${error?.message || "Unknown error"}`);
    }

    return {
      id: data.id,
      schoolId: data.school_id,
      key: data.key,
      label: data.label,
      type: data.type,
      required: Boolean(data.required),
      visible: Boolean(data.visible),
      visibleInTable: Boolean(data.visible_in_table),
      createdAt: data.created_at,
    };
  },

  async updateField(schoolId: string, fieldId: string, input: StudentFieldUpdateInput): Promise<SchoolStudentField> {
    const payload: Record<string, unknown> = {};

    if (input.key !== undefined) payload.key = toSnakeCase(input.key);
    if (input.label !== undefined) payload.label = input.label.trim();
    if (input.type !== undefined) payload.type = input.type;
    if (input.required !== undefined) payload.required = Boolean(input.required);
    if (input.visible !== undefined) payload.visible = Boolean(input.visible);
    if (input.visibleInTable !== undefined || input.visible_in_table !== undefined) {
      payload.visible_in_table = Boolean(input.visibleInTable ?? input.visible_in_table);
    }

    const { data, error } = await supabaseAdmin
      .from("school_student_fields")
      .update(payload)
      .eq("school_id", schoolId)
      .eq("id", fieldId)
      .select("id, school_id, key, label, type, required, visible, visible_in_table, created_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update student field: ${error?.message || "Unknown error"}`);
    }

    return {
      id: data.id,
      schoolId: data.school_id,
      key: data.key,
      label: data.label,
      type: data.type,
      required: Boolean(data.required),
      visible: Boolean(data.visible),
      visibleInTable: Boolean(data.visible_in_table),
      createdAt: data.created_at,
    };
  },

  async deleteField(schoolId: string, fieldId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("school_student_fields")
      .delete()
      .eq("school_id", schoolId)
      .eq("id", fieldId);

    if (error) {
      throw new Error(`Failed to delete student field: ${error.message}`);
    }
  },

  mergeExtraDataFromInput(input: Record<string, unknown>): Record<string, unknown> {
    const explicit = normalizeObject(input.extra_data ?? input.extraData);
    const inferred: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (CORE_STUDENT_KEYS.has(key)) {
        continue;
      }
      if (value === undefined) {
        continue;
      }
      const normalizedKey = toSnakeCase(key);
      if (!normalizedKey) {
        continue;
      }
      inferred[normalizedKey] = value;
    }

    return {
      ...explicit,
      ...inferred,
    };
  },

  async normalizeAndValidateExtraData(schoolId: string, raw: Record<string, unknown>): Promise<Record<string, unknown>> {
    const normalized = normalizeObject(raw);
    const fields = await this.listFields(schoolId);
    const fieldByKey = new Map(fields.map((field) => [field.key, field]));

    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(normalized)) {
      const configuredField = fieldByKey.get(key);
      if (!configuredField) {
        output[key] = value;
        continue;
      }
      output[key] = sanitizeByType(value, configuredField.type);
    }

    const missing = fields.filter((field) => field.required && isMissing(output[field.key]));
    if (missing.length > 0) {
      throw new Error(`Missing required custom fields: ${missing.map((field) => field.label).join(", ")}`);
    }

    return output;
  },
};
