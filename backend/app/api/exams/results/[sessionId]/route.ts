import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examRoleService } from "@/lib/services/examRoleService";
import { examEvaluationService } from "@/lib/services/examEvaluationService";

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
    const results = await examEvaluationService.listResultsBySession(sessionId, auth.user.id);
    return ok(results, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exam results";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden")
      ? 403
      : lower.includes("not found")
        ? 404
        : lower.includes("subscription required") || lower.includes("plan") || lower.includes("not enabled")
          ? 402
          : 500;
    return fail({ code: status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 402 ? "exam_plan_required" : "fetch_failed", message }, status, origin);
  }
}
