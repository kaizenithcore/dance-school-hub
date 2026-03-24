import type { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { getPortalNotificationContract } from "@/lib/services/portalNotificationService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const data = getPortalNotificationContract();
  return ok(data, 200, origin);
}
