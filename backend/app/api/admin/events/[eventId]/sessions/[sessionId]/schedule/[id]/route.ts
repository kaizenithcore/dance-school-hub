import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { eventScheduleItemService } from "@/lib/services/eventScheduleItemService";
import { updateScheduleItemSchema } from "@/lib/validators/eventScheduleItemSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{
    eventId: string;
    sessionId: string;
    id: string;
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
    const { eventId, sessionId, id } = await context.params;
    const item = await eventScheduleItemService.getScheduleItem(
      auth.context.tenantId,
      eventId,
      sessionId,
      id
    );

    if (!item) {
      return fail(
        {
          code: "not_found",
          message: "Schedule item not found",
        },
        404,
        origin
      );
    }

    return ok(item, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch schedule item";
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
    const { eventId, sessionId, id } = await context.params;
    const body = await request.json();
    const parsed = updateScheduleItemSchema.safeParse(body);

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

    const item = await eventScheduleItemService.updateScheduleItem(
      auth.context.tenantId,
      eventId,
      sessionId,
      id,
      parsed.data
    );
    return ok(
      {
        item,
        warnings: item.warnings ?? [],
      },
      200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update schedule item";
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
    const { eventId, sessionId, id } = await context.params;
    await eventScheduleItemService.deleteScheduleItem(auth.context.tenantId, eventId, sessionId, id);
    return ok({ success: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete schedule item";
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
