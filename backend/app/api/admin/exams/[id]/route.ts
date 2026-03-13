import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { examSuiteService } from "@/lib/services/examSuiteService";
import { examSuiteFeatureService } from "@/lib/services/examSuiteFeatureService";
import { updateExamSchema } from "@/lib/validators/examSuiteSchemas";

interface RouteContext {
  params: Promise<{ id: string }>;
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
    const { id } = await context.params;
    const exam = await examSuiteService.getExam(auth.context.tenantId, id);

    if (!exam) {
      return fail({ code: "not_found", message: "Exam not found" }, 404, origin);
    }

    return ok(exam, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load exam";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
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
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateExamSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const updated = await examSuiteService.updateExam(auth.context.tenantId, id, parsed.data);
    return ok(updated, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update exam";
    const status = message.includes("not found") ? 404 : 500;
    return fail({ code: status === 404 ? "not_found" : "update_failed", message }, status, origin);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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
    const { id } = await context.params;
    await examSuiteService.deleteExam(auth.context.tenantId, id);
    return ok({ deleted: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete exam";
    const status = message.includes("not found") ? 404 : 500;
    return fail({ code: status === 404 ? "not_found" : "delete_failed", message }, status, origin);
  }
}
