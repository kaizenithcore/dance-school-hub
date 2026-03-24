import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { portalFoundationService } from "@/lib/services/portalFoundationService";
import { updateFeedPostSchema } from "@/lib/validators/portalFoundationSchemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = updateFeedPostSchema.safeParse(body);

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

    const { id } = await context.params;
    const updated = await portalFoundationService.updateFeedPost(auth.context.tenantId, id, parsed.data);
    return ok(updated, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update feed post";
    const status = message === "Post not found" ? 404 : 500;
    return fail({ code: "update_failed", message }, status, origin);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const result = await portalFoundationService.deleteFeedPost(auth.context.tenantId, id);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete feed post";
    return fail({ code: "delete_failed", message }, 500, origin);
  }
}
