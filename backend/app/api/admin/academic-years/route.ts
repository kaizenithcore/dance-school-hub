import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  const tenantId = auth.context.tenantId;

  try {
    const { data: academicYears, error: academicYearsError } = await supabaseAdmin
      .from("academic_years")
      .select("id, year_code, display_name, start_date, end_date, is_active, data_retention_months, archived_at")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false });

    if (academicYearsError) {
      return fail(
        { code: "database_error", message: academicYearsError.message },
        500,
        origin
      );
    }

    const { data: schoolSettings } = await supabaseAdmin
      .from("school_settings")
      .select("current_academic_year_id")
      .eq("tenant_id", tenantId)
      .single();

    const result = {
      academicYears: (academicYears || []).map((year) => ({
        id: year.id,
        yearCode: year.year_code,
        displayName: year.display_name,
        startDate: year.start_date,
        endDate: year.end_date,
        isActive: year.is_active,
        dataRetentionMonths: year.data_retention_months,
        archivedAt: year.archived_at,
      })),
      currentAcademicYearId: schoolSettings?.current_academic_year_id || null,
    };

    return ok(result, 200, origin);
  } catch (error) {
    return fail(
      { code: "server_error", message: "Failed to fetch academic years" },
      500,
      origin
    );
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  const tenantId = auth.context.tenantId;

  try {
    const body = await request.json();
    const { yearCode, displayName, startDate, endDate, dataRetentionMonths = 36 } = body;

    if (!yearCode || !displayName || !startDate || !endDate) {
      return fail(
        { code: "validation_error", message: "Missing required fields" },
        400,
        origin
      );
    }

    const { data: academicYear, error: createError } = await supabaseAdmin
      .from("academic_years")
      .insert({
        tenant_id: tenantId,
        year_code: yearCode,
        display_name: displayName,
        start_date: startDate,
        end_date: endDate,
        data_retention_months: dataRetentionMonths,
      })
      .select("id, year_code, display_name, start_date, end_date, is_active, data_retention_months, archived_at")
      .single();

    if (createError) {
      return fail(
        { code: "database_error", message: createError.message },
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
      201,
      origin
    );
  } catch (error) {
    return fail(
      { code: "server_error", message: "Failed to create academic year" },
      500,
      origin
    );
  }
}
