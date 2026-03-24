import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { eventService } from "@/lib/services/eventService";
import { createEventSchema } from "@/lib/validators/eventSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const pageParam = request.nextUrl.searchParams.get("page");
    const pageSizeParam = request.nextUrl.searchParams.get("pageSize");

    if (pageParam || pageSizeParam) {
      const page = Number.parseInt(pageParam ?? "1", 10);
      const pageSize = Number.parseInt(pageSizeParam ?? "20", 10);

      if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
        return fail(
          {
            code: "invalid_request",
            message: "Invalid pagination parameters",
          },
          400,
          origin
        );
      }

      const events = await eventService.listEventsPaginated(auth.context.tenantId, { page, pageSize });
      return ok(events, 200, origin);
    }

    const events = await eventService.listEvents(auth.context.tenantId);
    return ok(events, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch events";
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

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);

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

    const event = await eventService.createEvent(auth.context.tenantId, parsed.data, auth.user?.id);
    return ok(event, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event";
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
