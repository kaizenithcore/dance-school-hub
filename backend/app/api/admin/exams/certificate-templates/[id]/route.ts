import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { examSuiteService } from "@/lib/services/examSuiteService";
import { examSuiteFeatureService } from "@/lib/services/examSuiteFeatureService";
import { updateCertificateTemplateSchema } from "@/lib/validators/examSuiteSchemas";
import { permissionService } from "@/lib/services/permissionService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PUT(request: NextRequest, context: RouteContext) {
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
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateCertificateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const updated = await examSuiteService.updateCertificateTemplate(auth.context.tenantId, id, parsed.data);
    return ok(updated, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update template";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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
    const { id } = await context.params;
    await examSuiteService.deleteCertificateTemplate(auth.context.tenantId, id);
    return ok({ deleted: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete template";
    return fail({ code: "delete_failed", message }, 500, origin);
  }
}
