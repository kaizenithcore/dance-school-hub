import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { examSuiteService } from "@/lib/services/examSuiteService";
import { examSuiteFeatureService } from "@/lib/services/examSuiteFeatureService";
import { createExamSchema } from "@/lib/validators/examSuiteSchemas";

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

async function ensureFeatureEnabled(tenantId: string) {
  return examSuiteFeatureService.isEnabledForTenant(tenantId);
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!canManage(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const enabled = await ensureFeatureEnabled(auth.context.tenantId);
  if (!enabled) {
    return fail({ code: "feature_disabled", message: "ExamSuite module is not active for this tenant" }, 403, origin);
  }

  try {
    const exams = await examSuiteService.listExams(auth.context.tenantId);
    return ok(exams, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load exams";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!canManage(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const enabled = await ensureFeatureEnabled(auth.context.tenantId);
  if (!enabled) {
    return fail({ code: "feature_disabled", message: "ExamSuite module is not active for this tenant" }, 403, origin);
  }

  try {
    const body = await request.json();
    const parsed = createExamSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const created = await examSuiteService.createExam(auth.context.tenantId, parsed.data);
    return ok(created, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create exam";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
