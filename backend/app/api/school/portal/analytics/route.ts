import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { portalAnalyticsOverviewSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!permissionService.canManageSettings({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const parsed = portalAnalyticsOverviewSchema.safeParse({
    days: request.nextUrl.searchParams.get("days") ?? undefined,
  });

  if (!parsed.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid query parameters",
        details: parsed.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const data = await portalFoundationService.getPortalAnalyticsOverview(auth.context.tenantId, parsed.data);
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load portal analytics";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
