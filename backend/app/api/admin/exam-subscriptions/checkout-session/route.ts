import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { stripeService } from "@/lib/services/stripeService";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";

const checkoutSchema = z.object({
  organizationId: z.string().uuid().optional(),
  plan: z.enum(["core", "lite", "pro"]),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  billingProvider: z.enum(["stripe", "manual"]).optional(),
  manualNote: z.string().trim().max(500).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

function resolveOrganizationId(
  authContext: NonNullable<Awaited<ReturnType<typeof requireAuth>>["context"]>,
  requestedOrganizationId: string | undefined
) {
  return requestedOrganizationId || authContext.organizationId || null;
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

  if (!permissionService.canManageBilling({ tenantRole: auth.context.role, organizationRole: auth.context.organizationRole })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const organizationId = resolveOrganizationId(auth.context, parsed.data.organizationId);
    if (!organizationId) {
      return fail({ code: "invalid_request", message: "organizationId is required in organization context" }, 400, origin);
    }

    const requestedProvider = parsed.data.billingProvider || "stripe";
    const stripeAvailable = stripeService.isConfigured();
    const useManualFallback = requestedProvider === "manual" || !stripeAvailable;

    if (useManualFallback) {
      const manualRequest = await examSubscriptionService.createManualSubscriptionRequest({
        organizationId,
        plan: parsed.data.plan,
        billingCycle: parsed.data.billingCycle,
        actorUserId: auth.user.id,
        note: parsed.data.manualNote,
        origin: origin || undefined,
      });

      return ok(
        {
          ...manualRequest,
          billingProvider: "manual",
          fallbackReason: stripeAvailable ? "manual_requested" : "stripe_not_configured",
        },
        202,
        origin
      );
    }

    const appBaseUrl = origin || "http://localhost:8081";
    const successUrl = parsed.data.successUrl || `${appBaseUrl}/admin/settings?tab=billing&stripe=success&module=examsuit`;
    const cancelUrl = parsed.data.cancelUrl || `${appBaseUrl}/admin/settings?tab=billing&stripe=cancel&module=examsuit`;

    const session = await examSubscriptionService.createCheckoutSession({
      organizationId,
      plan: parsed.data.plan,
      billingCycle: parsed.data.billingCycle,
      actorUserId: auth.user.id,
      customerEmail: auth.user.email || undefined,
      successUrl,
      cancelUrl,
    });

    return ok({ ...session, billingProvider: "stripe" }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create exam subscription checkout session";
    return fail({ code: "stripe_checkout_failed", message }, 500, origin);
  }
}
