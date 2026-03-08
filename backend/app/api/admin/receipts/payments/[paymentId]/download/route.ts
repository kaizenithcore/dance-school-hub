import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail } from "@/lib/http";
import { corsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { receiptService } from "@/lib/services/receiptService";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> }
) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  try {
    const { paymentId } = await context.params;
    const pdfBuffer = await receiptService.buildPaymentReceiptPdf(
      auth.context.tenantId,
      auth.user.id,
      paymentId
    );

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=recibo-${paymentId}.pdf`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate payment receipt";
    let status = 500;

    if (message.includes("not found")) {
      status = 404;
    } else if (message.includes("accepted enrollment")) {
      status = 409;
    }

    return fail({ code: "download_failed", message }, status, origin);
  }
}
