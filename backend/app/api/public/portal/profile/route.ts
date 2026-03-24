import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { upsertStudentProfileSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  try {
    const profile = await portalFoundationService.getOrCreateOwnProfile(auth.userId);
    return ok(profile, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = upsertStudentProfileSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid payload",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const profile = await portalFoundationService.upsertOwnProfile(auth.userId, parsed.data);
    return ok(profile, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}
