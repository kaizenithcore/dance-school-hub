import { apiRequest } from "@/lib/api/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface CreateStripeCheckoutInput {
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, unknown>;
  successUrl?: string;
  cancelUrl?: string;
}

interface StripeCheckoutResponse {
  success: boolean;
  data?: {
    sessionId: string;
    checkoutUrl: string | null;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface BillingCheckoutResponse {
  sessionId: string;
  checkoutUrl: string | null;
}

export type BillingCycle = "monthly" | "annual";

export interface CreateBillingCheckoutInput {
  planType: "starter" | "pro" | "enterprise";
  billingCycle: BillingCycle;
  extraStudentBlocks: number;
  addons: {
    customDomain: boolean;
    prioritySupport: boolean;
    waitlistAutomation: boolean;
    renewalAutomation: boolean;
  };
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateExamSubscriptionCheckoutInput {
  plan: "core" | "lite" | "pro";
  billingCycle: BillingCycle;
  billingProvider?: "stripe" | "manual";
  manualNote?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface ExamSubscriptionCheckoutResponse {
  checkoutUrl?: string | null;
  billingProvider?: "stripe" | "manual";
  fallbackReason?: string;
  [key: string]: unknown;
}

export function isStripeFrontendConfigured() {
  return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
}

export async function createStripeCheckoutSession(input: CreateStripeCheckoutInput) {
  if (!isStripeFrontendConfigured()) {
    throw new Error("Falta VITE_STRIPE_PUBLISHABLE_KEY en el frontend");
  }

  const response = await fetch(`${API_URL}/api/public/payments/checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as StripeCheckoutResponse;

  if (!response.ok || !payload.success || !payload.data?.checkoutUrl) {
    throw new Error(payload.error?.message || "No se pudo crear la sesión de Stripe");
  }

  return payload.data;
}

export async function redirectToStripeCheckout(input: CreateStripeCheckoutInput) {
  const session = await createStripeCheckoutSession(input);
  window.location.assign(session.checkoutUrl);
}

export async function createBillingCheckoutSession(input: CreateBillingCheckoutInput): Promise<BillingCheckoutResponse> {
  const response = await apiRequest<BillingCheckoutResponse>("/api/admin/billing/checkout-session", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.success || !response.data?.checkoutUrl) {
    throw new Error(response.error?.message || "No se pudo crear la sesión de checkout para billing");
  }

  return response.data;
}

export async function redirectToBillingCheckout(input: CreateBillingCheckoutInput) {
  const session = await createBillingCheckoutSession(input);
  window.location.assign(session.checkoutUrl);
}

export async function createExamSubscriptionCheckoutSession(input: CreateExamSubscriptionCheckoutInput) {
  const response = await apiRequest<ExamSubscriptionCheckoutResponse>("/api/admin/exam-subscriptions/checkout-session", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear la sesión de checkout para Certifier");
  }

  return response.data;
}

export async function redirectToExamSubscriptionCheckout(input: CreateExamSubscriptionCheckoutInput) {
  const session = await createExamSubscriptionCheckoutSession(input);

  if (session.checkoutUrl) {
    window.location.assign(session.checkoutUrl);
  }

  return session;
}
