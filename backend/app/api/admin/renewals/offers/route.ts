import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { renewalService } from "@/lib/services/renewalService";

function canManageRenewals(role: string) {
  return role === "owner" || role === "admin";
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

  if (!canManageRenewals(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const featureEnabled = await renewalService.isRenewalEnabled(auth.context.tenantId);
  if (!featureEnabled) {
    return fail({ code: "feature_disabled", message: "Renewals module is not active for this tenant" }, 403, origin);
  }

  try {
    const campaignId = request.nextUrl.searchParams.get("campaignId") || "";
    const statusRaw = request.nextUrl.searchParams.get("status");
    const status =
      statusRaw === "pending" || statusRaw === "confirmed" || statusRaw === "changed" || statusRaw === "released"
        ? statusRaw
        : undefined;

    if (!campaignId) {
      return fail({ code: "invalid_request", message: "campaignId is required" }, 400, origin);
    }

    const offers = await renewalService.listOffersByCampaign(auth.context.tenantId, campaignId, status);
    return ok(offers, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load renewal offers";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!canManageRenewals(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const featureEnabled = await renewalService.isRenewalEnabled(auth.context.tenantId);
  if (!featureEnabled) {
    return fail({ code: "feature_disabled", message: "Renewals module is not active for this tenant" }, 403, origin);
  }

  try {
    const body = await request.json();
    const campaignId = typeof body?.campaignId === "string" ? body.campaignId : "";
    const offerId = typeof body?.offerId === "string" ? body.offerId : "";
    const action = body?.action === "confirm" || body?.action === "change" || body?.action === "release" ? body.action : null;
    const proposedClassIds = Array.isArray(body?.proposedClassIds)
      ? body.proposedClassIds.filter((item: unknown) => typeof item === "string")
      : undefined;

    if (!campaignId || !offerId || !action) {
      return fail({ code: "invalid_request", message: "campaignId, offerId and action are required" }, 400, origin);
    }

    const result = await renewalService.updateOfferStatus({
      tenantId: auth.context.tenantId,
      actorUserId: auth.user.id,
      campaignId,
      offerId,
      action,
      proposedClassIds,
    });

    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update renewal offer";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}
