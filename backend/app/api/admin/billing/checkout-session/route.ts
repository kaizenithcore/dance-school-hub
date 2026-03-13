import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { stripeService, type SubscriptionCheckoutLineItem } from "@/lib/services/stripeService";
import { getEnv } from "@/lib/env";
import { type PlanType } from "@/lib/services/featureEntitlementsService";

const planSchema = z.enum(["starter", "pro", "enterprise"]);

const checkoutSchema = z.object({
  planType: planSchema,
  extraStudentBlocks: z.number().int().min(0).default(0),
  addons: z.object({
    customDomain: z.boolean().default(false),
    prioritySupport: z.boolean().default(false),
    waitlistAutomation: z.boolean().default(false),
    renewalAutomation: z.boolean().default(false),
  }),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const PLAN_MONTHLY_AMOUNT_CENTS: Record<PlanType, number> = {
  starter: 17900,
  pro: 49900,
  enterprise: 94900,
};

const BLOCK_MONTHLY_AMOUNT_CENTS: Record<PlanType, number> = {
  starter: 2400,
  pro: 5900,
  enterprise: 11900,
};

const ADDON_MONTHLY_AMOUNT_CENTS = {
  customDomain: 2900,
  prioritySupport: 7900,
  waitlistAutomation: 2400,
  renewalAutomation: 3900,
} as const;

function canEdit(role: string) {
  return role === "owner" || role === "admin";
}

function buildPlanLineItem(env: ReturnType<typeof getEnv>, planType: PlanType): SubscriptionCheckoutLineItem {
  const priceIdByPlan: Record<PlanType, string | undefined> = {
    starter: env.STRIPE_PRICE_STARTER,
    pro: env.STRIPE_PRICE_PRO,
    enterprise: env.STRIPE_PRICE_ENTERPRISE,
  };

  const priceId = priceIdByPlan[planType];

  if (priceId) {
    return {
      priceId,
      quantity: 1,
    };
  }

  return {
    quantity: 1,
    currency: "eur",
    unitAmountCents: PLAN_MONTHLY_AMOUNT_CENTS[planType],
    productName: `DanceHub plan ${planType}`,
    recurringInterval: "month",
  };
}

function buildBlockLineItem(env: ReturnType<typeof getEnv>, planType: PlanType, blocks: number): SubscriptionCheckoutLineItem | null {
  if (blocks <= 0) {
    return null;
  }

  const blockPriceIdByPlan: Record<PlanType, string | undefined> = {
    starter: env.STRIPE_PRICE_BLOCK_STARTER,
    pro: env.STRIPE_PRICE_BLOCK_PRO,
    enterprise: env.STRIPE_PRICE_BLOCK_ENTERPRISE,
  };

  const priceId = blockPriceIdByPlan[planType];

  if (priceId) {
    return {
      priceId,
      quantity: blocks,
    };
  }

  return {
    quantity: blocks,
    currency: "eur",
    unitAmountCents: BLOCK_MONTHLY_AMOUNT_CENTS[planType],
    productName: `DanceHub extra student block (${planType})`,
    recurringInterval: "month",
  };
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

  if (!canEdit(auth.context.role)) {
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
      return fail(
        {
          code: "invalid_request",
          message: "Payload de checkout invalido",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const env = getEnv();
    const input = parsed.data;
    const planType = input.planType;

    const lineItems: SubscriptionCheckoutLineItem[] = [
      buildPlanLineItem(env, planType),
    ];

    const blockLineItem = buildBlockLineItem(env, planType, input.extraStudentBlocks);
    if (blockLineItem) {
      lineItems.push(blockLineItem);
    }

    if (input.addons.customDomain) {
      if (env.STRIPE_PRICE_ADDON_CUSTOM_DOMAIN) {
        lineItems.push({ priceId: env.STRIPE_PRICE_ADDON_CUSTOM_DOMAIN, quantity: 1 });
      } else {
        lineItems.push({
          quantity: 1,
          currency: "eur",
          unitAmountCents: ADDON_MONTHLY_AMOUNT_CENTS.customDomain,
          productName: "DanceHub add-on custom domain",
          recurringInterval: "month",
        });
      }
    }

    if (input.addons.prioritySupport) {
      if (env.STRIPE_PRICE_ADDON_PRIORITY_SUPPORT) {
        lineItems.push({ priceId: env.STRIPE_PRICE_ADDON_PRIORITY_SUPPORT, quantity: 1 });
      } else {
        lineItems.push({
          quantity: 1,
          currency: "eur",
          unitAmountCents: ADDON_MONTHLY_AMOUNT_CENTS.prioritySupport,
          productName: "DanceHub add-on priority support",
          recurringInterval: "month",
        });
      }
    }

    if (input.addons.waitlistAutomation) {
      if (env.STRIPE_PRICE_ADDON_WAITLIST_AUTOMATION) {
        lineItems.push({ priceId: env.STRIPE_PRICE_ADDON_WAITLIST_AUTOMATION, quantity: 1 });
      } else {
        lineItems.push({
          quantity: 1,
          currency: "eur",
          unitAmountCents: ADDON_MONTHLY_AMOUNT_CENTS.waitlistAutomation,
          productName: "DanceHub add-on waitlist automation",
          recurringInterval: "month",
        });
      }
    }

    if (input.addons.renewalAutomation) {
      lineItems.push({
        quantity: 1,
        currency: "eur",
        unitAmountCents: ADDON_MONTHLY_AMOUNT_CENTS.renewalAutomation,
        productName: "DanceHub add-on renewal automation",
        recurringInterval: "month",
      });
    }

    const appBaseUrl = origin || "http://localhost:8081";
    const successUrl = input.successUrl || `${appBaseUrl}/admin/settings?tab=billing&stripe=success`;
    const cancelUrl = input.cancelUrl || `${appBaseUrl}/admin/settings?tab=billing&stripe=cancel`;

    const session = await stripeService.createSubscriptionCheckoutSession({
      successUrl,
      cancelUrl,
      customerEmail: auth.user.email || undefined,
      metadata: {
        tenantId: auth.context.tenantId,
        planType,
        extraStudentBlocks: String(input.extraStudentBlocks),
        customDomain: String(input.addons.customDomain),
        prioritySupport: String(input.addons.prioritySupport),
        waitlistAutomation: String(input.addons.waitlistAutomation),
        renewalAutomation: String(input.addons.renewalAutomation),
      },
      lineItems,
    });

    return ok(
      {
        sessionId: session.id,
        checkoutUrl: session.url,
      },
      200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la sesion de checkout";
    return fail({ code: "stripe_checkout_failed", message }, 500, origin);
  }
}
