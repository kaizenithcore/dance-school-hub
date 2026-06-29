import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requirePlatformOwner } from "@/lib/auth/requirePlatformOwner";
import { platformAdminService } from "@/lib/services/platformAdminService";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requirePlatformOwner(request);
  if (!auth.authorized) return auth.response!;

  try {
    const tenants = await platformAdminService.listAllTenants();
    return ok(tenants, 200, origin);
  } catch (error) {
    return fail({ code: "fetch_failed", message: error instanceof Error ? error.message : "Failed" }, 500, origin);
  }
}
