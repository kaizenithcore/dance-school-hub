import Stripe from "stripe";
import { getEnv } from "@/lib/env";

export interface CreateCheckoutSessionInput {
  amountCents: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionCheckoutLineItem {
  priceId?: string;
  quantity?: number;
  unitAmountCents?: number;
  currency?: string;
  productName?: string;
  recurringInterval?: "month" | "year";
}

export interface CreateSubscriptionCheckoutSessionInput {
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  lineItems: SubscriptionCheckoutLineItem[];
}

export interface StripeCompletedCheckoutMatch {
  sessionId: string;
  completedAt: string;
}

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

function sanitizeMetadata(metadata?: Record<string, string>): Record<string, string> | undefined {
  if (!metadata) {
    return undefined;
  }

  const entries = Object.entries(metadata)
    .filter(([key, value]) => key.trim().length > 0 && value.trim().length > 0)
    .slice(0, 20);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export const stripeService = {
  isConfigured(): boolean {
    const env = getEnv();
    return Boolean(env.STRIPE_SECRET_KEY);
  },

  async createCheckoutSession(input: CreateCheckoutSessionInput) {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountCents,
            product_data: {
              name: input.description,
            },
          },
        },
      ],
      metadata: sanitizeMetadata(input.metadata),
    });

    return {
      id: session.id,
      url: session.url,
    };
  },

  async createSubscriptionCheckoutSession(input: CreateSubscriptionCheckoutSessionInput) {
    const stripe = getStripeClient();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of input.lineItems) {
      const quantity = Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity || 1)) : 1;

      if (item.priceId) {
        lineItems.push({
          price: item.priceId,
          quantity,
        });
        continue;
      }

      if (!item.unitAmountCents || !item.currency || !item.productName) {
        continue;
      }

      lineItems.push({
        quantity,
        price_data: {
          currency: item.currency.toLowerCase(),
          unit_amount: item.unitAmountCents,
          recurring: {
            interval: item.recurringInterval || "month",
          },
          product_data: {
            name: item.productName,
          },
        },
      });
    }

    if (lineItems.length === 0) {
      throw new Error("No Stripe line items were provided for subscription checkout");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: lineItems,
      customer_email: input.customerEmail,
      metadata: sanitizeMetadata(input.metadata),
    });

    return {
      id: session.id,
      url: session.url,
    };
  },

  async findLatestCompletedSubscriptionCheckoutByTenant(tenantId: string): Promise<StripeCompletedCheckoutMatch | null> {
    const stripe = getStripeClient();

    // Stripe Events API does not support metadata filters, so we inspect recent completed checkout events.
    const events = await stripe.events.list({
      type: "checkout.session.completed",
      limit: 100,
    });

    for (const event of events.data) {
      const payload = event.data.object;
      if (!payload || payload.object !== "checkout.session") {
        continue;
      }

      const session = payload as Stripe.Checkout.Session;
      const metadataTenantId = typeof session.metadata?.tenantId === "string"
        ? session.metadata.tenantId
        : null;

      if (metadataTenantId !== tenantId) {
        continue;
      }

      if (session.mode !== "subscription") {
        continue;
      }

      if (session.payment_status !== "paid" && session.status !== "complete") {
        continue;
      }

      return {
        sessionId: session.id,
        completedAt: new Date(event.created * 1000).toISOString(),
      };
    }

    return null;
  },
};
