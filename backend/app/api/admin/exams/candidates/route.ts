import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { examSuiteService } from "@/lib/services/examSuiteService";
import { examSuiteFeatureService } from "@/lib/services/examSuiteFeatureService";
import { registerCandidateSchema } from "@/lib/validators/examSuiteSchemas";
import { permissionService } from "@/lib/services/permissionService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!permissionService.canManageExams({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const enabled = await examSuiteFeatureService.isEnabledForTenant(auth.context.tenantId);
  if (!enabled) {
    return fail({ code: "feature_disabled", message: "ExamSuite module is not active for this tenant" }, 403, origin);
  }

  try {
    const examId = request.nextUrl.searchParams.get("examId") || undefined;
    const candidates = await examSuiteService.listCandidates(auth.context.tenantId, examId);
    return ok(candidates, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load exam candidates";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!permissionService.canManageExams({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const enabled = await examSuiteFeatureService.isEnabledForTenant(auth.context.tenantId);
  if (!enabled) {
    return fail({ code: "feature_disabled", message: "ExamSuite module is not active for this tenant" }, 403, origin);
  }

  try {
    const body = await request.json();
    const examId = typeof body?.exam_id === "string" ? body.exam_id : "";
    if (!examId) {
      return fail({ code: "invalid_request", message: "exam_id is required" }, 400, origin);
    }

    const parsed = registerCandidateSchema.safeParse(body);
    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const candidate = await examSuiteService.registerCandidatePublic(examId, parsed.data);
    return ok(candidate, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create candidate";
    const status = message.includes("not found") ? 404 : 400;
    return fail({ code: status === 404 ? "not_found" : "create_failed", message }, status, origin);
  }
}
