import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requirePlatformOwner } from "@/lib/auth/requirePlatformOwner";
import { platformAdminService } from "@/lib/services/platformAdminService";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

/** POST { suspended: boolean } — toggle suspension for a tenant */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requirePlatformOwner(request);
  if (!auth.authorized) return auth.response!;

  const { id } = await params;
  try {
    const body = await request.json();
    const suspended = Boolean(body.suspended);
    await platformAdminService.setSuspended(id, suspended);
    return ok({ tenantId: id, suspended }, 200, origin);
  } catch (error) {
    return fail({ code: "update_failed", message: error instanceof Error ? error.message : "Failed" }, 500, origin);
  }
}
