import type { NextRequest } from "next/server";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { eventHelpersService } from "@/lib/services/eventHelpersService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const helpers = await eventHelpersService.getHelpers(auth.context.tenantId);
    return ok(helpers, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch event helpers";
    return fail(
      {
        code: "fetch_failed",
        message,
      },
      500,
      origin
    );
  }
}