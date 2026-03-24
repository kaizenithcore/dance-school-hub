import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import { corsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { paymentIdParamSchema } from "@/lib/validators/studentPortalSchemas";
import { studentPortalService } from "@/lib/services/studentPortalService";

interface RouteContext {
  params: Promise<{ paymentId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = paymentIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid payment id",
        details: parsedParams.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const receipt = await studentPortalService.getStudentReceiptText(auth.userId, parsedParams.data.paymentId);
    return new Response(receipt.content, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${receipt.fileName}\"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to download receipt";
    const status = message === "Payment not found" || message === "Student context not found" ? 404 : 500;
    return fail({ code: "download_failed", message }, status, origin);
  }
}
