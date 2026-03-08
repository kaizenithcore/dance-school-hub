import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { paymentService } from "@/lib/services/paymentService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);
  const { id } = await context.params;

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return fail(
        {
          code: "invalid_request",
          message: "Missing status",
        },
        400,
        origin
      );
    }

    const payment = await paymentService.updatePaymentStatus(
      auth.context.tenantId,
      id,
      status
    );

    return ok(payment, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update payment";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}
