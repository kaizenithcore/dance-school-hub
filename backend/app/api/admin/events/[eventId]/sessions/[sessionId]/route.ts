import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { eventSessionService } from "@/lib/services/eventSessionService";
import { updateSessionSchema } from "@/lib/validators/eventSessionSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{
    eventId: string;
    sessionId: string;
  }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { eventId, sessionId } = await context.params;
    const session = await eventSessionService.getSession(auth.context.tenantId, eventId, sessionId);

    if (!session) {
      return fail(
        {
          code: "not_found",
          message: "Session not found",
        },
        404,
        origin
      );
    }

    return ok(session, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch session";
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

export async function PUT(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { eventId, sessionId } = await context.params;
    const body = await request.json();
    const parsed = updateSessionSchema.safeParse(body);

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

    const session = await eventSessionService.updateSession(
      auth.context.tenantId,
      eventId,
      sessionId,
      parsed.data
    );
    return ok(session, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session";
    return fail(
      {
        code: "update_failed",
        message,
      },
      500,
      origin
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { eventId, sessionId } = await context.params;
    await eventSessionService.deleteSession(auth.context.tenantId, eventId, sessionId);
    return ok({ success: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete session";
    return fail(
      {
        code: "delete_failed",
        message,
      },
      500,
      origin
    );
  }
}
