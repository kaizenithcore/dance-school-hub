import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
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
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limitParsed = Number.parseInt(limitRaw || "50", 10);
  const limit = Number.isFinite(limitParsed) ? Math.max(1, Math.min(limitParsed, 200)) : 50;

  try {
    const data = await publicIntegrationsService.listPublishedEvents(tenantSlug, limit);
    if (!data) {
      return fail({ code: "not_found", message: "School not found" }, 404, origin);
    }

    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch integration events";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
