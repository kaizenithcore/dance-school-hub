import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");

  try {
    const { id } = await context.params;
    const profile = await portalFoundationService.getTeacherPublicProfile(id);

    if (!profile) {
      return fail(
        {
          code: "not_found",
          message: "Teacher profile not found",
        },
        404,
        origin
      );
    }

    return ok(profile, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch teacher profile";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
