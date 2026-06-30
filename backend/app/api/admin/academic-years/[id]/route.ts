import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  const tenantId = auth.context.tenantId;
  const { id } = await context.params;

  try {
    const body = await request.json();
    const { yearCode, displayName, startDate, endDate, dataRetentionMonths } = body;

    const updates: Record<string, unknown> = {};
    if (typeof yearCode === "string" && yearCode) updates.year_code = yearCode;
    if (typeof displayName === "string" && displayName) updates.display_name = displayName;
    if (typeof startDate === "string" && startDate) updates.start_date = startDate;
    if (typeof endDate === "string" && endDate) updates.end_date = endDate;
    if (typeof dataRetentionMonths === "number") updates.data_retention_months = dataRetentionMonths;

    if (Object.keys(updates).length === 0) {
      return fail({ code: "validation_error", message: "No fields to update" }, 400, origin);
    }

    const { data: academicYear, error: updateError } = await supabaseAdmin
      .from("academic_years")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("id, year_code, display_name, start_date, end_date, is_active, data_retention_months, archived_at")
      .single();

    if (updateError || !academicYear) {
      return fail(
        { code: "not_found", message: updateError?.message || "Academic year not found" },
        404,
        origin
      );
    }

    return ok(
      {
        academicYear: {
          id: academicYear.id,
          yearCode: academicYear.year_code,
          displayName: academicYear.display_name,
          startDate: academicYear.start_date,
          endDate: academicYear.end_date,
          isActive: academicYear.is_active,
          dataRetentionMonths: academicYear.data_retention_months,
          archivedAt: academicYear.archived_at,
        },
      },
      200,
      origin
    );
  } catch {
    return fail({ code: "server_error", message: "Failed to update academic year" }, 500, origin);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  const tenantId = auth.context.tenantId;
  const { id } = await context.params;

  try {
    const { data: academicYear, error: fetchError } = await supabaseAdmin
      .from("academic_years")
      .select("id, is_active")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !academicYear) {
      return fail({ code: "not_found", message: "Academic year not found" }, 404, origin);
    }

    const { data: schoolSettings } = await supabaseAdmin
      .from("school_settings")
      .select("current_academic_year_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (schoolSettings?.current_academic_year_id === id) {
      return fail(
        { code: "is_current_year", message: "No puedes eliminar el curso académico activo. Cambia a otro curso primero." },
        409,
        origin
      );
    }

    const { count: classCount } = await supabaseAdmin
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("academic_year_id", id);

    const { count: enrollmentCount } = await supabaseAdmin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("academic_year_id", id);

    if ((classCount || 0) > 0 || (enrollmentCount || 0) > 0) {
      return fail(
        {
          code: "has_dependent_records",
          message: "No puedes eliminar este curso porque tiene clases o inscripciones asociadas.",
        },
        409,
        origin
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("academic_years")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (deleteError) {
      return fail({ code: "database_error", message: deleteError.message }, 500, origin);
    }

    return ok({ deleted: true }, 200, origin);
  } catch {
    return fail({ code: "server_error", message: "Failed to delete academic year" }, 500, origin);
  }
}
