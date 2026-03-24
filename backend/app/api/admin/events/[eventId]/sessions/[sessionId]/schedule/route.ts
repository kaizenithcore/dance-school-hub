import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { eventScheduleItemService } from "@/lib/services/eventScheduleItemService";
import { createScheduleItemSchema } from "@/lib/validators/eventScheduleItemSchemas";
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
    const items = await eventScheduleItemService.listScheduleItems(
      auth.context.tenantId,
      eventId,
      sessionId
    );
    return ok(items, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch schedule items";
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

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { eventId, sessionId } = await context.params;
    const body = await request.json();
    const parsed = createScheduleItemSchema.safeParse(body);

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

    const item = await eventScheduleItemService.createScheduleItem(
      auth.context.tenantId,
      eventId,
      sessionId,
      parsed.data,
      auth.user?.id
    );
    return ok(
      {
        item,
        warnings: item.warnings ?? [],
      },
      201,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create schedule item";
    return fail(
      {
        code: "create_failed",
        message,
      },
      500,
      origin
    );
  }
}
