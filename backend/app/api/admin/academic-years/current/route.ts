import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  const tenantId = auth.context.tenantId;

  try {
    const body = await request.json();
    const { academicYearId } = body;

    if (!academicYearId) {
      return fail(
        { code: "validation_error", message: "Missing academicYearId" },
        400,
        origin
      );
    }

    // Verify the academic year belongs to this tenant
    const { data: academicYear, error: fetchError } = await supabaseAdmin
      .from("academic_years")
      .select("id, year_code, display_name, start_date, end_date, is_active, data_retention_months, archived_at")
      .eq("id", academicYearId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !academicYear) {
      return fail(
        { code: "not_found", message: "Academic year not found" },
        404,
        origin
      );
    }

    // Update the current academic year in school_settings
    const { error: updateError } = await supabaseAdmin
      .from("school_settings")
      .update({ current_academic_year_id: academicYearId })
      .eq("tenant_id", tenantId);

    if (updateError) {
      return fail(
        { code: "database_error", message: updateError.message },
        500,
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
  } catch (error) {
    return fail(
      { code: "server_error", message: "Failed to update current academic year" },
      500,
      origin
    );
  }
}
