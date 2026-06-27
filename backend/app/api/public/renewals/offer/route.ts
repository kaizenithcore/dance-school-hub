import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { renewalService } from "@/lib/services/renewalService";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const offerId = request.nextUrl.searchParams.get("id") || "";

  if (!offerId) return fail({ code: "invalid_request", message: "id required" }, 400, origin);

  try {
    const details = await renewalService.getPublicOfferDetails(offerId);
    return ok(details, 200, origin);
  } catch (error) {
    return fail({ code: "not_found", message: error instanceof Error ? error.message : "Offer not found" }, 404, origin);
  }
}
