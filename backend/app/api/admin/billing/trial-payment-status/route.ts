import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { stripeService } from "@/lib/services/stripeService";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function debugTrialSync(message: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info(`[settings-trial-sync] ${message}`, payload);
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!permissionService.canManageBilling({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const tenantId = auth.context.tenantId;

  if (!stripeService.isConfigured()) {
    return ok({ synced: false, reason: "stripe_not_configured" }, 200, origin);
  }

  try {
    const matched = await stripeService.findLatestCompletedSubscriptionCheckoutByTenant(tenantId);
    if (!matched) {
      debugTrialSync("Stripe sync: no completed checkout found", { tenantId });
      return ok({ synced: false, reason: "no_checkout_found" }, 200, origin);
    }

    const { data: existingSettings, error: existingSettingsError } = await supabaseAdmin
      .from("school_settings")
      .select("payment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (existingSettingsError) {
      return fail({ code: "fetch_failed", message: existingSettingsError.message }, 500, origin);
    }

    const existingPaymentConfig = asObject(existingSettings?.payment_config);
    const existingBillingConfig = asObject(existingPaymentConfig.billing ?? existingPaymentConfig.billing_config);

    const alreadyCompleted = asBoolean(
      existingBillingConfig.trialPaymentCompleted ?? existingBillingConfig.trial_payment_completed,
      false
    );

    const nextPaymentConfig: Record<string, unknown> = {
      ...existingPaymentConfig,
      billing: {
        ...existingBillingConfig,
        trialPaymentCompleted: true,
        trialPaymentCompletedAt:
          (typeof existingBillingConfig.trialPaymentCompletedAt === "string" && existingBillingConfig.trialPaymentCompletedAt)
          || matched.completedAt,
      },
    };

    const { error: upsertError } = await supabaseAdmin
      .from("school_settings")
      .upsert(
        {
          tenant_id: tenantId,
          payment_config: nextPaymentConfig,
        },
        { onConflict: "tenant_id" }
      );

    if (upsertError) {
      return fail({ code: "update_failed", message: upsertError.message }, 500, origin);
    }

    debugTrialSync("Stripe sync: trial marked as completed", {
      tenantId,
      sessionId: matched.sessionId,
      alreadyCompleted,
      completedAt: matched.completedAt,
    });

    return ok(
      {
        synced: true,
        source: "stripe_events",
        sessionId: matched.sessionId,
        completedAt: matched.completedAt,
      },
      200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync trial payment status";
    return fail({ code: "stripe_sync_failed", message }, 500, origin);
  }
}
