import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { acceptSchoolInvitationSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = acceptSchoolInvitationSchema.safeParse(body);

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

    const result = await portalFoundationService.acceptSchoolInvitation(auth.userId, parsed.data.code);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to accept invitation";
    const status =
      message === "Invitation not found" ||
      message === "Invitation expired" ||
      message === "Invitation does not match authenticated account email"
        ? 400
        : 500;
    return fail({ code: "accept_failed", message }, status, origin);
  }
}
