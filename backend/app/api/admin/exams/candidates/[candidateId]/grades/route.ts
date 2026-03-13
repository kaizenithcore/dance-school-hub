import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { saveGradesSchema } from "@/lib/validators/examSuiteSchemas";
import { examSuiteService } from "@/lib/services/examSuiteService";
import { examSuiteFeatureService } from "@/lib/services/examSuiteFeatureService";

interface RouteContext {
  params: Promise<{ candidateId: string }>;
}

function canGrade(role: string) {
  return role === "owner" || role === "admin" || role === "staff";
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

  if (!canGrade(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const enabled = await examSuiteFeatureService.isEnabledForTenant(auth.context.tenantId);
  if (!enabled) {
    return fail({ code: "feature_disabled", message: "ExamSuite module is not active for this tenant" }, 403, origin);
  }

  try {
    const { candidateId } = await context.params;
    const body = await request.json();
    const parsed = saveGradesSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const result = await examSuiteService.saveCandidateGrades(auth.context.tenantId, candidateId, auth.user.id, parsed.data);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save grades";
    const status = message.includes("not found") ? 404 : 400;
    return fail({ code: status === 404 ? "not_found" : "grading_failed", message }, status, origin);
  }
}
