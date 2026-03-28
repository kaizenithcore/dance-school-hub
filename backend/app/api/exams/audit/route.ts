import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examRoleService } from "@/lib/services/examRoleService";
import { examAuditService } from "@/lib/services/examAuditService";
import { listExamAuditEventsSchema } from "@/lib/validators/examCoreSchemas";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
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

  const parsed = listExamAuditEventsSchema.safeParse({
    session_id: request.nextUrl.searchParams.get("session_id") || undefined,
    school_id: request.nextUrl.searchParams.get("school_id") || undefined,
    action: request.nextUrl.searchParams.get("action") || undefined,
    limit: request.nextUrl.searchParams.get("limit")
      ? Number(request.nextUrl.searchParams.get("limit"))
      : undefined,
  });

  if (!parsed.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid query parameters",
        details: parsed.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const result = await examAuditService.listEvents(auth.user.id, parsed.data);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list exam audit events";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden") ? 403 : 500;

    return fail(
      {
        code: status === 403 ? "forbidden" : "fetch_failed",
        message,
      },
      status,
      origin
    );
  }
}
