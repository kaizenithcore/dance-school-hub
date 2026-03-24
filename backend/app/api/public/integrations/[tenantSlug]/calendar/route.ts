import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import { corsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { publicIntegrationsService } from "@/lib/services/publicIntegrationsService";

interface RouteContext {
  params: Promise<{ tenantSlug: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const { tenantSlug } = await context.params;

  try {
    const exportData = await publicIntegrationsService.exportSchoolCalendarIcs(tenantSlug);

    if (!exportData) {
      return fail({ code: "not_found", message: "School not found" }, 404, origin);
    }

    return new Response(exportData.content, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${exportData.filename}\"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export school calendar";
    return fail({ code: "export_failed", message }, 500, origin);
  }
}
