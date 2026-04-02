import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { stripeService, type SubscriptionCheckoutLineItem } from "@/lib/services/stripeService";
import { getEnv } from "@/lib/env";
import { type PlanType } from "@/lib/services/featureEntitlementsService";
import { getCommercialPlan, getSubscriptionAddon } from "@/lib/commercialCatalog";
import { permissionService } from "@/lib/services/permissionService";

const planSchema = z.enum(["starter", "pro", "enterprise"]);
const billingCycleSchema = z.enum(["monthly", "annual"]);
type BillingCycle = z.infer<typeof billingCycleSchema>;

const checkoutSchema = z.object({
  planType: planSchema,
  billingCycle: billingCycleSchema.default("annual"),
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

function canEdit(role: string) {
  return role === "owner" || role === "admin";
}

function intervalForCycle(billingCycle: BillingCycle): "month" | "year" {
  return billingCycle === "annual" ? "year" : "month";
}

function buildPlanLineItem(env: ReturnType<typeof getEnv>, planType: PlanType, billingCycle: BillingCycle): SubscriptionCheckoutLineItem {
  const priceIdByPlan: Record<BillingCycle, Record<PlanType, string | undefined>> = {
    monthly: {
      starter: env.STRIPE_PRICE_STARTER,
      pro: env.STRIPE_PRICE_PRO,
      enterprise: env.STRIPE_PRICE_ENTERPRISE,
    },
    annual: {
      starter: env.STRIPE_PRICE_STARTER_ANNUAL,
      pro: env.STRIPE_PRICE_PRO_ANNUAL,
      enterprise: env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
    },
  };

  const priceId = priceIdByPlan[billingCycle][planType];

  if (priceId) {
    return {
      priceId,
      quantity: 1,
    };
  }

  const plan = getCommercialPlan(planType);

  return {
    quantity: 1,
    currency: "eur",
    unitAmountCents: billingCycle === "annual"
      ? plan.billing.annualTotalEur * 100
      : plan.billing.monthlyPriceEur * 100,
    productName: `DanceHub plan ${planType}`,
    recurringInterval: intervalForCycle(billingCycle),
  };
}

function buildBlockLineItem(
  env: ReturnType<typeof getEnv>,
  planType: PlanType,
  blocks: number,
  billingCycle: BillingCycle
): SubscriptionCheckoutLineItem | null {
  if (blocks <= 0) {
    return null;
  }

  const blockPriceIdByPlan: Record<BillingCycle, Record<PlanType, string | undefined>> = {
    monthly: {
      starter: env.STRIPE_PRICE_BLOCK_STARTER,
      pro: env.STRIPE_PRICE_BLOCK_PRO,
      enterprise: env.STRIPE_PRICE_BLOCK_ENTERPRISE,
    },
    annual: {
      starter: env.STRIPE_PRICE_BLOCK_STARTER_ANNUAL,
      pro: env.STRIPE_PRICE_BLOCK_PRO_ANNUAL,
      enterprise: env.STRIPE_PRICE_BLOCK_ENTERPRISE_ANNUAL,
    },
  };

  const priceId = blockPriceIdByPlan[billingCycle][planType];

  if (priceId) {
    return {
      priceId,
      quantity: blocks,
    };
  }

  const monthlyPrice = getCommercialPlan(planType).extraStudentBlocks.monthlyPriceEur;

  return {
    quantity: blocks,
    currency: "eur",
    unitAmountCents: (billingCycle === "annual" ? monthlyPrice * 12 : monthlyPrice) * 100,
    productName: `DanceHub extra student block (${planType})`,
    recurringInterval: intervalForCycle(billingCycle),
  };
}

function addonPriceId(env: ReturnType<typeof getEnv>, key: "customDomain" | "prioritySupport" | "waitlistAutomation" | "renewalAutomation", billingCycle: BillingCycle): string | undefined {
  if (billingCycle === "annual") {
    if (key === "customDomain") return env.STRIPE_PRICE_ADDON_CUSTOM_DOMAIN_ANNUAL;
    if (key === "prioritySupport") return env.STRIPE_PRICE_ADDON_PRIORITY_SUPPORT_ANNUAL;
    if (key === "waitlistAutomation") return env.STRIPE_PRICE_ADDON_WAITLIST_AUTOMATION_ANNUAL;
    return env.STRIPE_PRICE_ADDON_RENEWAL_AUTOMATION_ANNUAL;
  }

  if (key === "customDomain") return env.STRIPE_PRICE_ADDON_CUSTOM_DOMAIN;
  if (key === "prioritySupport") return env.STRIPE_PRICE_ADDON_PRIORITY_SUPPORT;
  if (key === "waitlistAutomation") return env.STRIPE_PRICE_ADDON_WAITLIST_AUTOMATION;
  return env.STRIPE_PRICE_ADDON_RENEWAL_AUTOMATION;
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
    const billingCycle = input.billingCycle;

    if (planType === "starter" && input.extraStudentBlocks > 0) {
      return fail(
        {
          code: "invalid_request",
          message: "Starter no admite bloques extra de alumnos",
        },
        400,
        origin
      );
    }

    const lineItems: SubscriptionCheckoutLineItem[] = [
      buildPlanLineItem(env, planType, billingCycle),
    ];

    const blockLineItem = buildBlockLineItem(env, planType, input.extraStudentBlocks, billingCycle);
    if (blockLineItem) {
      lineItems.push(blockLineItem);
    }

    if (input.addons.customDomain) {
      const priceId = addonPriceId(env, "customDomain", billingCycle);
      if (priceId) {
        lineItems.push({ priceId, quantity: 1 });
      } else {
        const monthly = getSubscriptionAddon("customDomain").monthlyPriceEur;
        lineItems.push({
          quantity: 1,
          currency: "eur",
          unitAmountCents: (billingCycle === "annual" ? monthly * 12 : monthly) * 100,
          productName: "DanceHub add-on custom domain",
          recurringInterval: intervalForCycle(billingCycle),
        });
      }
    }

    if (input.addons.prioritySupport) {
      const priceId = addonPriceId(env, "prioritySupport", billingCycle);
      if (priceId) {
        lineItems.push({ priceId, quantity: 1 });
      } else {
        const monthly = getSubscriptionAddon("prioritySupport").monthlyPriceEur;
        lineItems.push({
          quantity: 1,
          currency: "eur",
          unitAmountCents: (billingCycle === "annual" ? monthly * 12 : monthly) * 100,
          productName: "DanceHub add-on priority support",
          recurringInterval: intervalForCycle(billingCycle),
        });
      }
    }

    // Compatibilidad con payloads legacy: se procesa si llega en el request.
    if (input.addons.waitlistAutomation) {
      const priceId = addonPriceId(env, "waitlistAutomation", billingCycle);
      if (priceId) {
        lineItems.push({ priceId, quantity: 1 });
      } else {
        const monthly = getSubscriptionAddon("waitlistAutomation").monthlyPriceEur;
        lineItems.push({
          quantity: 1,
          currency: "eur",
          unitAmountCents: (billingCycle === "annual" ? monthly * 12 : monthly) * 100,
          productName: "DanceHub add-on waitlist automation",
          recurringInterval: intervalForCycle(billingCycle),
        });
      }
    }

    if (input.addons.renewalAutomation) {
      const priceId = addonPriceId(env, "renewalAutomation", billingCycle);
      if (priceId) {
        lineItems.push({ priceId, quantity: 1 });
      } else {
        const monthly = getSubscriptionAddon("renewalAutomation").monthlyPriceEur;
      lineItems.push({
        quantity: 1,
        currency: "eur",
          unitAmountCents: (billingCycle === "annual" ? monthly * 12 : monthly) * 100,
        productName: "DanceHub add-on renewal automation",
          recurringInterval: intervalForCycle(billingCycle),
      });
      }
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
        billingCycle,
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
