import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { outboxService } from "@/lib/services/outboxService";
import { permissionService } from "@/lib/services/permissionService";

function canRunJobs(role: string) {
  return role === "owner" || role === "admin";
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!permissionService.canManageBilling({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit = Number(body?.limit || 20);
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;

    const result = await outboxService.tickTenantEmailQueue(auth.context.tenantId, safeLimit);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process queue";
    return fail({ code: "job_failed", message }, 500, origin);
  }
}
