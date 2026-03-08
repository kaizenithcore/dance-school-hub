import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { waitlistService } from "@/lib/services/waitlistService";

function canManageWaitlist(role: string) {
  return role === "owner" || role === "admin";
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!canManageWaitlist(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const action = body?.action === "process_expired" ? "process_expired" : "offer_next";
    const classId = typeof body?.classId === "string" ? body.classId : "";

    if (action === "offer_next") {
      if (!classId) {
        return fail({ code: "invalid_request", message: "classId is required" }, 400, origin);
      }

      const result = await waitlistService.offerNext(auth.context.tenantId, auth.user.id, classId);
      return ok(result, 200, origin);
    }

    const result = await waitlistService.processExpiredOffers(auth.context.tenantId, classId || undefined);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process waitlist offers";
    return fail({ code: "process_failed", message }, 500, origin);
  }
}
