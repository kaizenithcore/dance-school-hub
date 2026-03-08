import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { paymentService } from "@/lib/services/paymentService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const payments = await paymentService.listPayments(auth.context.tenantId);
    return ok(payments, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch payments";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { studentId, amount, status = "paid", metadata } = body;

    if (!studentId || !amount) {
      return fail(
        {
          code: "invalid_request",
          message: "Missing studentId or amount",
        },
        400,
        origin
      );
    }

    const amountCents = Math.round(amount * 100);
    const payment = await paymentService.recordPayment(
      auth.context.tenantId,
      studentId,
      amountCents,
      status,
      metadata
    );

    return ok(payment, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record payment";
    if (message === "Student has no accepted enrollment") {
      return fail({ code: "enrollment_not_accepted", message }, 409, origin);
    }
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
