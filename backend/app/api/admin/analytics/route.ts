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
    const analytics = await paymentService.getAnalyticsData(auth.context.tenantId);
    return ok(analytics, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch analytics";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
