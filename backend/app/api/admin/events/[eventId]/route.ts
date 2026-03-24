import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { eventService } from "@/lib/services/eventService";
import { updateEventSchema } from "@/lib/validators/eventSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{
    eventId: string;
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
    const { eventId } = await context.params;
    const event = await eventService.getEvent(auth.context.tenantId, eventId);

    if (!event) {
      return fail(
        {
          code: "not_found",
          message: "Event not found",
        },
        404,
        origin
      );
    }

    return ok(event, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch event";
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
    const { eventId } = await context.params;
    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);

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

    const event = await eventService.updateEvent(auth.context.tenantId, eventId, parsed.data, auth.user?.id);
    return ok(event, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update event";
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
    const { eventId } = await context.params;
    await eventService.deleteEvent(auth.context.tenantId, eventId, auth.user?.id);
    return ok({ success: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete event";
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
