import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examRoleService } from "@/lib/services/examRoleService";
import { examEvaluationService } from "@/lib/services/examEvaluationService";
import { createExamEvaluationSchema } from "@/lib/validators/examCoreSchemas";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
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
    const body = await request.json();
    const parsed = createExamEvaluationSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const saved = await examEvaluationService.upsertEvaluation(sessionId, auth.user.id, parsed.data);
    return ok(saved, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save exam evaluation";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden")
      ? 403
      : lower.includes("not found")
        ? 404
        : lower.includes("subscription required") || lower.includes("plan") || lower.includes("not enabled")
          ? 402
          : 500;
    return fail({ code: status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 402 ? "exam_plan_required" : "save_failed", message }, status, origin);
  }
}
