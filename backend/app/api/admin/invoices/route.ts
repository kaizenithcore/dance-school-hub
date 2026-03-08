import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { invoiceService } from "@/lib/services/invoiceService";

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
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const invoices = await invoiceService.listInvoices(auth.context.tenantId, month || undefined);
    return ok(invoices, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch invoices";
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
    const { month } = await request.json();

    if (!month) {
      return fail({ code: "invalid_input", message: "Month is required (format: YYYY-MM)" }, 400, origin);
    }

    console.log(`[Invoice Generation] Starting for tenant ${auth.context.tenantId}, month ${month}`);
    const invoices = await invoiceService.generateMonthlyInvoices(auth.context.tenantId, month);
    console.log(`[Invoice Generation] Completed: ${invoices.length} invoices created`);
    return ok(
      {
        created: invoices.length,
        invoices,
        message: `Generated ${invoices.length} invoice(s) for ${month}`,
      },
      201,
      origin
    );
  } catch (error) {
    console.error("[Invoice Generation Error]", error);
    const message = error instanceof Error ? error.message : "Failed to generate invoices";
    return fail({ code: "generation_failed", message }, 500, origin);
  }
}
