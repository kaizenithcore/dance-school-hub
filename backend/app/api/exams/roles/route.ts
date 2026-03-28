import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examRoleService } from "@/lib/services/examRoleService";
import {
  listExamRoleAssignmentsSchema,
  upsertExamRoleAssignmentSchema,
} from "@/lib/validators/examCoreSchemas";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!permissionService.canManageExams({ tenantRole: auth.context.role, organizationRole: auth.context.organizationRole })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const parsed = listExamRoleAssignmentsSchema.safeParse({
    organization_id: request.nextUrl.searchParams.get("organization_id") || undefined,
    school_id: request.nextUrl.searchParams.get("school_id") || undefined,
    user_id: request.nextUrl.searchParams.get("user_id") || undefined,
    role: request.nextUrl.searchParams.get("role") || undefined,
    active_only: request.nextUrl.searchParams.get("active_only")
      ? request.nextUrl.searchParams.get("active_only") === "true"
      : undefined,
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
    const result = await examRoleService.listRoleAssignments(auth.user.id, parsed.data);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list exam role assignments";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden") ? 403 : 500;
    return fail({ code: status === 403 ? "forbidden" : "fetch_failed", message }, status, origin);
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!permissionService.canManageExams({ tenantRole: auth.context.role, organizationRole: auth.context.organizationRole })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = upsertExamRoleAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const result = await examRoleService.upsertRoleAssignment(auth.user.id, parsed.data);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upsert exam role assignment";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden") ? 403 : 500;
    return fail({ code: status === 403 ? "forbidden" : "upsert_failed", message }, status, origin);
  }
}
