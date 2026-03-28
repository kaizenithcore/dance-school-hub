import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";

function resolveOrganizationId(
  authContext: NonNullable<Awaited<ReturnType<typeof requireAuth>>["context"]>,
  requestedOrganizationId: string | undefined
) {
  return requestedOrganizationId || authContext.organizationId || null;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!permissionService.canManageBilling({ tenantRole: auth.context.role, organizationRole: auth.context.organizationRole })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const organizationId = resolveOrganizationId(
      auth.context,
      request.nextUrl.searchParams.get("organizationId") || undefined
    );

    const matrix = examSubscriptionService.getFeatureMatrix();

    if (!organizationId) {
      return ok(
        {
          matrix,
          plans: {
            lite: examSubscriptionService.getPlanCapabilities("lite"),
            core: examSubscriptionService.getPlanCapabilities("core"),
            pro: examSubscriptionService.getPlanCapabilities("pro"),
          },
        },
        200,
        origin
      );
    }

    const organization = await examSubscriptionService.getOrganizationFeatureSummary(organizationId);
    return ok(
      {
        matrix,
        plans: {
          lite: examSubscriptionService.getPlanCapabilities("lite"),
          core: examSubscriptionService.getPlanCapabilities("core"),
          pro: examSubscriptionService.getPlanCapabilities("pro"),
        },
        organization,
      },
      200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load exam feature matrix";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
