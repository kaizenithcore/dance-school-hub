import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { stripeService } from "@/lib/services/stripeService";

interface CheckoutSessionBody {
  amount?: number;
  currency?: string;
  description?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
}

function normalizeMetadata(input: Record<string, unknown> | undefined): Record<string, string> {
  if (!input) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      normalized[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      normalized[key] = String(value);
    }
  }

  return normalized;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    if (!stripeService.isConfigured()) {
      return fail(
        {
          code: "stripe_not_configured",
          message: "Stripe no está configurado en el backend",
        },
        503,
        origin
      );
    }

    const body = (await request.json()) as CheckoutSessionBody;
    const amount = body.amount;

    if (!Number.isFinite(amount) || Number(amount) <= 0) {
      return fail(
        {
          code: "invalid_amount",
          message: "El monto debe ser mayor que 0",
        },
        400,
        origin
      );
    }

    const baseUrl = origin || "http://localhost:5173";
    const successUrl = body.successUrl || `${baseUrl}/admin/payments?stripe=success`;
    const cancelUrl = body.cancelUrl || `${baseUrl}/admin/payments?stripe=cancel`;

    const session = await stripeService.createCheckoutSession({
      amountCents: Math.round(Number(amount) * 100),
      currency: (body.currency || "eur").toLowerCase(),
      description: body.description || "Pago DanceHub",
      successUrl,
      cancelUrl,
      metadata: normalizeMetadata(body.metadata),
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
    const message = error instanceof Error ? error.message : "No se pudo crear la sesión de Stripe";
    return fail(
      {
        code: "stripe_checkout_failed",
        message,
      },
      500,
      origin
    );
  }
}
