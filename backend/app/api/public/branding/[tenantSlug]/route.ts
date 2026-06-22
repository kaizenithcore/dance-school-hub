import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { brandingService } from "@/lib/services/brandingService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  const origin = request.headers.get("origin");
  const params = await context.params;

  try {
    const data = await brandingService.getPublicTenantBranding(params.tenantSlug);

    if (!data) {
      return fail({ code: "not_found", message: "Tenant not found" }, 404, origin);
    }

    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load public branding";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
