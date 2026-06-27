import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { renewalService } from "@/lib/services/renewalService";
import { permissionService } from "@/lib/services/permissionService";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!permissionService.canManageRenewals({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const campaignId = typeof body?.campaignId === "string" ? body.campaignId : "";
    const offerIds   = Array.isArray(body?.offerIds) ? (body.offerIds as string[]) : undefined;
    const scheduledAt = typeof body?.scheduledAt === "string" ? body.scheduledAt : undefined;

    if (!campaignId) {
      return fail({ code: "invalid_request", message: "campaignId is required" }, 400, origin);
    }

    const result = await renewalService.sendOfferEmails({
      tenantId: auth.context.tenantId,
      campaignId,
      offerIds,
      scheduledAt,
    });

    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send renewal emails";
    return fail({ code: "send_failed", message }, 500, origin);
  }
}
