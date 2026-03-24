import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const data = await portalFoundationService.likeFeedPost(auth.userId, id);
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to like post";
    const status = message === "Public post not found" ? 404 : 400;
    return fail({ code: "update_failed", message }, status, origin);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const data = await portalFoundationService.unlikeFeedPost(auth.userId, id);
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unlike post";
    return fail({ code: "update_failed", message }, 400, origin);
  }
}
