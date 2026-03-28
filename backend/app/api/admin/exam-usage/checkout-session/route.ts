import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { stripeService } from "@/lib/services/stripeService";
import { examUsageBillingService } from "@/lib/services/examUsageBillingService";

const checkoutSchema = z.object({
  organizationId: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
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

  if (!stripeService.isConfigured()) {
    return fail(
      {
        code: "stripe_not_configured",
        message: "Stripe no esta configurado en backend. Falta STRIPE_SECRET_KEY.",
      },
      503,
      origin
    );
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

    const appBaseUrl = origin || "http://localhost:8081";
    const successUrl = parsed.data.successUrl || `${appBaseUrl}/admin/settings?tab=billing&stripe=success&module=certifier-usage`;
    const cancelUrl = parsed.data.cancelUrl || `${appBaseUrl}/admin/settings?tab=billing&stripe=cancel&module=certifier-usage`;

    const session = await examUsageBillingService.createUsageCheckoutSession({
      organizationId,
      month: parsed.data.month,
      actorUserId: auth.user.id,
      customerEmail: auth.user.email || undefined,
      successUrl,
      cancelUrl,
    });

    return ok(session, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create usage checkout session";
    const status = message.toLowerCase().includes("no unbilled") ? 409 : 500;
    return fail({ code: status === 409 ? "no_usage_to_bill" : "stripe_checkout_failed", message }, status, origin);
  }
}
