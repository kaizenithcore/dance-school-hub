import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { eventIdParamsSchema, listEventMediaSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");

  const parsedParams = eventIdParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid event id",
        details: parsedParams.error.flatten(),
      },
      400,
      origin
    );
  }

  const parsedQuery = listEventMediaSchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    offset: request.nextUrl.searchParams.get("offset") ?? undefined,
  });

  if (!parsedQuery.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid query parameters",
        details: parsedQuery.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const result = await portalFoundationService.listEventMediaPublic(parsedParams.data.id, parsedQuery.data);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch event media";
    const status = message === "Event not found" || message === "Event is not publicly available" ? 404 : 500;
    return fail({ code: "fetch_failed", message }, status, origin);
  }
}
