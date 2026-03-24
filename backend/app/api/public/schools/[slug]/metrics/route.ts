import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");

  try {
    const { slug } = await context.params;
    const result = await portalFoundationService.getPublicSchoolMetricsBySlug(slug);

    if (!result) {
      return fail(
        {
          code: "not_found",
          message: "School not found",
        },
        404,
        origin
      );
    }

    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch school metrics";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
