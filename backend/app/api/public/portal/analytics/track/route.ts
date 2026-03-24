import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { getAccessTokenFromRequest } from "@/lib/auth/tenantContext";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { trackPortalAnalyticsSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

async function resolveOptionalUserId(request: NextRequest): Promise<string | undefined> {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return undefined;
  }

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(accessToken);

  return user?.id;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const parsed = trackPortalAnalyticsSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid analytics payload",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const userId = await resolveOptionalUserId(request);
    const data = await portalFoundationService.trackAnalyticsEvent(parsed.data, userId);
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to track analytics event";
    return fail({ code: "track_failed", message }, 500, origin);
  }
}
