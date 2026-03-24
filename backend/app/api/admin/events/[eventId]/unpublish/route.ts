import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { eventService } from "@/lib/services/eventService";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { eventId } = await context.params;
    const event = await eventService.unpublishEvent(auth.context.tenantId, eventId, auth.user?.id);
    return ok(event, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unpublish event";
    const status = message.includes("not found") ? 404 : 500;
    return fail(
      {
        code: status === 404 ? "not_found" : "unpublish_failed",
        message,
      },
      status,
      origin
    );
  }
}