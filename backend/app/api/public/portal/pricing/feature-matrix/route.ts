import type { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { getPortalPlanFeatureMatrix } from "@/lib/constants/portalPlanFeatureMatrix";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const data = getPortalPlanFeatureMatrix();
  return ok(data, 200, origin);
}
