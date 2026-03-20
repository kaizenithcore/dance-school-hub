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

  const activeMembership = auth.memberships.find(
    (membership) => membership.tenantId === auth.context?.tenantId
  );

  return ok({
    user: auth.user,
    tenant: {
      id: auth.context.tenantId,
      role: auth.context.role,
      organizationId: activeMembership?.organizationId ?? null,
      organizationRole: activeMembership?.organizationRole ?? null,
    },
    memberships: auth.memberships,
    organizations: auth.organizations ?? [],
    activeOrganization: auth.activeOrganization ?? null,
  }, 200, origin);
}