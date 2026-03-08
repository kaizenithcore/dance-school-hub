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

  try {
    const enabled = await renewalService.isRenewalEnabled(auth.context.tenantId);
    if (!enabled) {
      return fail({ code: "feature_disabled", message: "Renewals feature is not enabled" }, 403, origin);
    }

    const campaigns = await renewalService.listCampaigns(auth.context.tenantId);
    return ok(campaigns, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load renewal campaigns";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!canManageRenewals(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const enabled = await renewalService.isRenewalEnabled(auth.context.tenantId);
    if (!enabled) {
      return fail({ code: "feature_disabled", message: "Renewals feature is not enabled" }, 403, origin);
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const fromPeriod = typeof body?.fromPeriod === "string" ? body.fromPeriod : "";
    const toPeriod = typeof body?.toPeriod === "string" ? body.toPeriod : "";
    const expiresAt = typeof body?.expiresAt === "string" ? body.expiresAt : undefined;

    if (!name || !fromPeriod || !toPeriod) {
      return fail({ code: "invalid_request", message: "name, fromPeriod and toPeriod are required" }, 400, origin);
    }

    const result = await renewalService.createCampaign({
      tenantId: auth.context.tenantId,
      actorUserId: auth.user.id,
      name,
      fromPeriod,
      toPeriod,
      expiresAt,
    });

    return ok(result, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
