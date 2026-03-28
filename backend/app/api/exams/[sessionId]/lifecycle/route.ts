import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examRoleService } from "@/lib/services/examRoleService";
import { examLifecycleService } from "@/lib/services/examLifecycleService";
import { transitionExamSessionLifecycleSchema } from "@/lib/validators/examCoreSchemas";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  const canManage = permissionService.canManageExams({ tenantRole: auth.context.role, organizationRole: auth.context.organizationRole });
  const hasFineRole = await examRoleService.hasAnyActiveRole(auth.user.id);
  if (!canManage && !hasFineRole) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const { sessionId } = await context.params;
    const lifecycle = await examLifecycleService.getLifecycle(auth.user.id, sessionId);
    return ok(lifecycle, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get exam lifecycle";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden") ? 403 : lower.includes("not found") ? 404 : 500;
    return fail({ code: status === 403 ? "forbidden" : status === 404 ? "not_found" : "fetch_failed", message }, status, origin);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  const canManage = permissionService.canManageExams({ tenantRole: auth.context.role, organizationRole: auth.context.organizationRole });
  const hasFineRole = await examRoleService.hasAnyActiveRole(auth.user.id);
  if (!canManage && !hasFineRole) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const { sessionId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = transitionExamSessionLifecycleSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const updated = await examLifecycleService.transition(auth.user.id, sessionId, parsed.data);
    return ok(updated, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to transition exam lifecycle";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden")
      ? 403
      : lower.includes("not found")
        ? 404
        : lower.includes("invalid lifecycle transition") || lower.includes("cannot move")
          ? 409
          : 500;

    return fail(
      {
        code: status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 409 ? "invalid_lifecycle_transition" : "transition_failed",
        message,
      },
      status,
      origin
    );
  }
}
