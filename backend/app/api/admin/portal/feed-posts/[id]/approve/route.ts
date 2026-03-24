import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ id: string }>;
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
    const body = await request.json().catch(() => ({}));
    const notes = typeof body?.notes === "string" ? body.notes : undefined;
    const { id } = await context.params;
    const data = await portalFoundationService.updateTeacherPostApproval(auth.context.tenantId, id, "published", notes);
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve teacher post";
    const status = message === "Teacher post not found" ? 404 : 500;
    return fail({ code: "update_failed", message }, status, origin);
  }
}
