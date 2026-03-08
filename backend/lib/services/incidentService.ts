import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { CreateIncidentInput, ListIncidentsQuery, UpdateIncidentInput } from "@/lib/validators/incidentSchemas";

interface IncidentRow {
  id: string;
  student_id: string;
  class_id: string | null;
  type: "absence" | "injury" | "group_change" | "other";
  status: "open" | "resolved";
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  students: { id: string; name: string; email: string | null } | Array<{ id: string; name: string; email: string | null }> | null;
  classes: { id: string; name: string } | Array<{ id: string; name: string }> | null;
}

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

function mapIncident(row: IncidentRow) {
  const student = one(row.students);
  const cls = one(row.classes);

  return {
    id: row.id,
    studentId: row.student_id,
    studentName: student?.name || "Alumno",
    studentEmail: student?.email || "",
    classId: row.class_id,
    className: cls?.name || null,
    type: row.type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes || "",
    createdBy: row.created_by,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export const incidentService = {
  async listIncidents(tenantId: string, query: ListIncidentsQuery) {
    let dbQuery = supabaseAdmin
      .from("student_incidents")
      .select("id, student_id, class_id, type, status, start_date, end_date, notes, created_by, resolved_by, resolved_at, created_at, students(id, name, email), classes(id, name)")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (query.fromDate) {
      dbQuery = dbQuery.gte("start_date", query.fromDate);
    }

    if (query.toDate) {
      dbQuery = dbQuery.lte("start_date", query.toDate);
    }

    if (query.status) {
      dbQuery = dbQuery.eq("status", query.status);
    }

    if (query.studentId) {
      dbQuery = dbQuery.eq("student_id", query.studentId);
    }

    dbQuery = dbQuery.limit(query.limit || 50);

    const { data, error } = await dbQuery;

    if (error) {
      throw new Error(`Failed to load incidents: ${error.message}`);
    }

    return ((data || []) as IncidentRow[]).map(mapIncident);
  },

  async createIncident(tenantId: string, userId: string, input: CreateIncidentInput) {
    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", input.studentId)
      .maybeSingle();

    if (studentError) {
      throw new Error(`Failed to validate student: ${studentError.message}`);
    }

    if (!student?.id) {
      throw new Error("Student not found");
    }

    if (input.classId) {
      const { data: cls, error: classError } = await supabaseAdmin
        .from("classes")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("id", input.classId)
        .maybeSingle();

      if (classError) {
        throw new Error(`Failed to validate class: ${classError.message}`);
      }

      if (!cls?.id) {
        throw new Error("Class not found");
      }
    }

    const { data, error } = await supabaseAdmin
      .from("student_incidents")
      .insert({
        tenant_id: tenantId,
        student_id: input.studentId,
        class_id: input.classId ?? null,
        type: input.type,
        status: "open",
        start_date: input.startDate,
        end_date: input.endDate ?? null,
        notes: input.notes ?? null,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create incident: ${error?.message || "Unknown error"}`);
    }

    const { data: incidentData, error: incidentError } = await supabaseAdmin
      .from("student_incidents")
      .select("id, student_id, class_id, type, status, start_date, end_date, notes, created_by, resolved_by, resolved_at, created_at, students(id, name, email), classes(id, name)")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .maybeSingle();

    if (incidentError) {
      throw new Error(`Incident created but failed to load: ${incidentError.message}`);
    }

    if (!incidentData) {
      throw new Error("Incident created but could not be loaded");
    }

    return mapIncident(incidentData as IncidentRow);
  },

  async updateIncident(tenantId: string, userId: string, incidentId: string, input: UpdateIncidentInput) {
    const payload: Record<string, unknown> = {};

    if (input.status !== undefined) {
      payload.status = input.status;
      if (input.status === "resolved") {
        payload.resolved_by = userId;
        payload.resolved_at = new Date().toISOString();
      } else {
        payload.resolved_by = null;
        payload.resolved_at = null;
      }
    }

    if (input.endDate !== undefined) {
      payload.end_date = input.endDate;
    }

    if (input.notes !== undefined) {
      payload.notes = input.notes;
    }

    const { data, error } = await supabaseAdmin
      .from("student_incidents")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", incidentId)
      .select("id, student_id, class_id, type, status, start_date, end_date, notes, created_by, resolved_by, resolved_at, created_at, students(id, name, email), classes(id, name)")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update incident: ${error.message}`);
    }

    if (!data) {
      throw new Error("Incident not found");
    }

    return mapIncident(data as IncidentRow);
  },
};
