import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user || !auth.context || !auth.memberships) {
    return auth.response;
  }

  return ok({
    user: auth.user,
    tenant: {
      id: auth.context.tenantId,
      role: auth.context.role,
    },
    memberships: auth.memberships,
  }, 200, origin);
}