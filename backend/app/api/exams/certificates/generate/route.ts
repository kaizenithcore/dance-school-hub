import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examRoleService } from "@/lib/services/examRoleService";
import { examCertificateService } from "@/lib/services/examCertificateService";
import { queueExamCertificateSchema } from "@/lib/validators/examCoreSchemas";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const parsed = queueExamCertificateSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const queued = await examCertificateService.enqueueCertificateGeneration(auth.user.id, parsed.data);
    return ok(queued, 202, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enqueue exam certificate generation";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden")
      ? 403
      : lower.includes("not found")
        ? 404
        : lower.includes("limit exceeded")
          ? 409
        : lower.includes("subscription required") || lower.includes("plan") || lower.includes("not enabled")
          ? 402
          : 500;
    return fail({ code: status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 409 ? "plan_limit_exceeded" : status === 402 ? "exam_plan_required" : "enqueue_failed", message }, status, origin);
  }
}
