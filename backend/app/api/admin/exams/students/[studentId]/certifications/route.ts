import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { examSuiteService } from "@/lib/services/examSuiteService";
import { examSuiteFeatureService } from "@/lib/services/examSuiteFeatureService";

interface RouteContext {
  params: Promise<{ studentId: string }>;
}

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!canManage(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const enabled = await examSuiteFeatureService.isEnabledForTenant(auth.context.tenantId);
  if (!enabled) {
    return fail({ code: "feature_disabled", message: "ExamSuite module is not active for this tenant" }, 403, origin);
  }

  try {
    const { studentId } = await context.params;
    const history = await examSuiteService.getStudentCertificationHistory(auth.context.tenantId, studentId);
    return ok(history, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load certification history";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
