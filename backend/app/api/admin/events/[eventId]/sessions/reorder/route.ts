import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { eventSessionService } from "@/lib/services/eventSessionService";
import { reorderSessionsSchema } from "@/lib/validators/eventSessionSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
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
    const body = await request.json();
    const parsed = reorderSessionsSchema.safeParse(body);

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

    await eventSessionService.reorderSessions(
      auth.context.tenantId,
      eventId,
      parsed.data
    );
    return ok({ success: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder sessions";
    return fail(
      {
        code: "reorder_failed",
        message,
      },
      500,
      origin
    );
  }
}
