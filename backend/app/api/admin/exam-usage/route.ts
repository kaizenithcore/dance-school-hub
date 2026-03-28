import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examUsageBillingService } from "@/lib/services/examUsageBillingService";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

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

    if (!organizationId) {
      return fail({ code: "invalid_request", message: "organizationId is required in organization context" }, 400, origin);
    }

    const fromMonthRaw = request.nextUrl.searchParams.get("fromMonth") || undefined;
    const toMonthRaw = request.nextUrl.searchParams.get("toMonth") || undefined;

    if (fromMonthRaw && !monthSchema.safeParse(fromMonthRaw).success) {
      return fail({ code: "invalid_request", message: "fromMonth must use YYYY-MM" }, 400, origin);
    }

    if (toMonthRaw && !monthSchema.safeParse(toMonthRaw).success) {
      return fail({ code: "invalid_request", message: "toMonth must use YYYY-MM" }, 400, origin);
    }

    const summary = await examUsageBillingService.getUsageSummaryForOrganization({
      organizationId,
      fromMonth: fromMonthRaw,
      toMonth: toMonthRaw,
    });

    return ok(summary, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Certifier usage summary";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
