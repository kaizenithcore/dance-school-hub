import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { scheduleService } from "@/lib/services/scheduleService";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

/**
 * GET /api/public/schedule/:tenantSlug
 * 
 * Public endpoint to get the school's calendar schedule
 * No authentication required
 * 
 * Query parameters:
 * - fromDate: YYYY-MM-DD (optional, defaults to today)
 * - toDate: YYYY-MM-DD (optional)
 * 
 * Returns:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "className": "Ballet Clásico",
 *       "discipline": "Ballet",
 *       "roomName": "Aula Principal",
 *       "weekday": 1,
 *       "startTime": "09:00",
 *       "endTime": "10:30",
 *       "capacity": 25,
 *       "studentCount": 12,
 *       "effectiveFrom": "2026-03-01",
 *       ...
 *     }
 *   ]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const origin = request.headers.get("origin");
    const { tenantSlug } = await params;

    // Resolve tenant by slug
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .single();

    if (tenantError || !tenant) {
      return fail(
        {
          code: "not_found",
          message: "Escuela no encontrada",
        },
        404,
        origin
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get("fromDate") || new Date().toISOString().split("T")[0];
    const toDate = searchParams.get("toDate") || undefined;

    // Get public schedule
    const schedules = await scheduleService.getPublicSchedule(
      tenant.id,
      fromDate,
      toDate
    );

    return ok(schedules, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error fetching schedule";
    return fail(
      {
        code: "error",
        message,
      },
      400,
      request.headers.get("origin")
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
