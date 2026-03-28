import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";

const upsertSchema = z.object({
  organizationId: z.string().uuid().optional(),
  plan: z.enum(["core", "lite", "pro"]),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  active: z.boolean().default(true),
  planType: z.enum(["exam_suit", "starter", "pro", "enterprise"]).optional(),
  stripeCustomerId: z.string().min(1).nullable().optional(),
  stripeSubscriptionId: z.string().min(1).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

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

    const subscription = await examSubscriptionService.getSubscriptionForOrganization(organizationId);
    return ok(subscription, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load exam subscription";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!permissionService.canManageBilling({ tenantRole: auth.context.role, organizationRole: auth.context.organizationRole })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const organizationId = resolveOrganizationId(auth.context, parsed.data.organizationId);
    if (!organizationId) {
      return fail({ code: "invalid_request", message: "organizationId is required in organization context" }, 400, origin);
    }

    const subscription = await examSubscriptionService.upsertSubscription({
      organizationId,
      plan: parsed.data.plan,
      billingCycle: parsed.data.billingCycle,
      active: parsed.data.active,
      planType: parsed.data.planType,
      stripeCustomerId: parsed.data.stripeCustomerId || null,
      stripeSubscriptionId: parsed.data.stripeSubscriptionId || null,
      metadata: parsed.data.metadata,
    });

    return ok(subscription, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upsert exam subscription";
    return fail({ code: "upsert_failed", message }, 500, origin);
  }
}
