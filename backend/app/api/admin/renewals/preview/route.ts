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

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) return auth.response;

  if (!permissionService.canManageRenewals({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const campaignId  = request.nextUrl.searchParams.get("campaignId") || "";
  const scheduleText = request.nextUrl.searchParams.get("scheduleText") ?? undefined;
  const scheduleUrl  = request.nextUrl.searchParams.get("scheduleUrl") ?? undefined;
  const scheduleHtml = request.nextUrl.searchParams.get("scheduleHtml") ?? undefined;

  if (!campaignId) return fail({ code: "invalid_request", message: "campaignId required" }, 400, origin);

  try {
    const html = await renewalService.getEmailPreviewHtml(auth.context.tenantId, campaignId, { scheduleText, scheduleUrl, scheduleHtml });
    return ok({ html }, 200, origin);
  } catch (error) {
    return fail({ code: "preview_failed", message: error instanceof Error ? error.message : "Failed to render preview" }, 500, origin);
  }
}
