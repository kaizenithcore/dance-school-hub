import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { invoiceService } from "@/lib/services/invoiceService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const invoiceDetail = await invoiceService.getInvoiceDetail(auth.context.tenantId, id);
    return ok(invoiceDetail, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch invoice details";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { paymentMethod, accountNumber, payerName } = body;

    const invoice = await invoiceService.markInvoiceAsPaid(
      auth.context.tenantId,
      id,
      {
        paymentMethod,
        accountNumber,
        payerName,
      }
    );

    return ok(invoice, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update invoice";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}
