import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { getEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export const runtime = "nodejs";

// Stripe requires the raw body for signature verification
export async function POST(request: NextRequest) {
  const env = getEnv();

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe-webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Webhook not configured", { status: 503 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    await handleStripeEvent(stripe, event);
  } catch (err) {
    console.error("[stripe-webhook] Handler error for event", event.type, err);
    // Return 200 to prevent Stripe retries for handler errors — log and fix separately
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleStripeEvent(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      // Unhandled event type — acknowledged silently
      break;
  }
}

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;
  if (session.payment_status !== "paid" && session.status !== "complete") return;

  const tenantId = session.metadata?.tenantId;
  if (!tenantId) {
    console.error("[stripe-webhook] checkout.session.completed: missing tenantId in metadata");
    return;
  }

  const planType = session.metadata?.planType ?? "starter";
  const billingCycle = session.metadata?.billingCycle ?? "monthly";
  const extraStudentBlocks = parseInt(session.metadata?.extraStudentBlocks ?? "0", 10);
  const customDomain = session.metadata?.customDomain === "true";
  const prioritySupport = session.metadata?.prioritySupport === "true";

  // Expand subscription to get subscription ID
  let stripeSubscriptionId: string | null = null;
  if (typeof session.subscription === "string") {
    stripeSubscriptionId = session.subscription;
  } else if (session.subscription && typeof session.subscription === "object") {
    stripeSubscriptionId = (session.subscription as Stripe.Subscription).id;
  }

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id ?? null;

  const paymentConfig = {
    billing: {
      planType,
      billingCycle,
      extraStudentBlocks: isNaN(extraStudentBlocks) ? 0 : extraStudentBlocks,
      addons: { customDomain, prioritySupport },
    },
    trialPaymentCompleted: true,
    stripeSubscriptionId,
    stripeCustomerId,
    stripeSessionId: session.id,
    paidAt: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("school_settings")
    .update({ payment_config: paymentConfig })
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[stripe-webhook] Failed to update school_settings for tenant", tenantId, error);
    throw error;
  }

  console.log("[stripe-webhook] Subscription activated for tenant", tenantId, "plan", planType, billingCycle);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Locate tenant by stripeSubscriptionId stored in payment_config
  const subscriptionId = subscription.id;
  const status = subscription.status;

  const { data: settings } = await supabaseAdmin
    .from("school_settings")
    .select("tenant_id, payment_config")
    .filter("payment_config->>stripeSubscriptionId", "eq", subscriptionId)
    .maybeSingle();

  if (!settings) {
    console.warn("[stripe-webhook] subscription.updated: no tenant found for subscription", subscriptionId);
    return;
  }

  const existing = (settings.payment_config ?? {}) as Record<string, unknown>;

  const { error } = await supabaseAdmin
    .from("school_settings")
    .update({
      payment_config: {
        ...existing,
        stripeSubscriptionStatus: status,
        subscriptionUpdatedAt: new Date().toISOString(),
      },
    })
    .eq("tenant_id", settings.tenant_id);

  if (error) {
    console.error("[stripe-webhook] Failed to update subscription status for tenant", settings.tenant_id, error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  const { data: settings } = await supabaseAdmin
    .from("school_settings")
    .select("tenant_id, payment_config")
    .filter("payment_config->>stripeSubscriptionId", "eq", subscriptionId)
    .maybeSingle();

  if (!settings) {
    console.warn("[stripe-webhook] subscription.deleted: no tenant found for subscription", subscriptionId);
    return;
  }

  const existing = (settings.payment_config ?? {}) as Record<string, unknown>;

  const { error } = await supabaseAdmin
    .from("school_settings")
    .update({
      payment_config: {
        ...existing,
        stripeSubscriptionStatus: "canceled",
        subscriptionCanceledAt: new Date().toISOString(),
      },
    })
    .eq("tenant_id", settings.tenant_id);

  if (error) {
    console.error("[stripe-webhook] Failed to mark subscription as canceled for tenant", settings.tenant_id, error);
    throw error;
  }

  console.log("[stripe-webhook] Subscription canceled for tenant", settings.tenant_id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const rawSubscription = (invoice as unknown as Record<string, unknown>).subscription;
  const subscriptionId =
    typeof rawSubscription === "string"
      ? rawSubscription
      : (rawSubscription as Stripe.Subscription | null)?.id ?? null;

  if (!subscriptionId) return;

  const { data: settings } = await supabaseAdmin
    .from("school_settings")
    .select("tenant_id, payment_config")
    .filter("payment_config->>stripeSubscriptionId", "eq", subscriptionId)
    .maybeSingle();

  if (!settings) return;

  const existing = (settings.payment_config ?? {}) as Record<string, unknown>;

  await supabaseAdmin
    .from("school_settings")
    .update({
      payment_config: {
        ...existing,
        stripeSubscriptionStatus: "past_due",
        lastPaymentFailedAt: new Date().toISOString(),
      },
    })
    .eq("tenant_id", settings.tenant_id);

  console.warn("[stripe-webhook] Payment failed for tenant", settings.tenant_id);
}
