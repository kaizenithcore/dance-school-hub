import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examCoreService } from "@/lib/services/examCoreService";
import { createExamMembershipSchema } from "@/lib/validators/examCoreSchemas";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

function hasExamPermission(authContext: NonNullable<Awaited<ReturnType<typeof requireAuth>>["context"]>) {
  return permissionService.canManageExams({
    tenantRole: authContext.role,
    organizationRole: authContext.organizationRole,
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!hasExamPermission(auth.context)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId") || undefined;
    const memberships = await examCoreService.listMemberships(auth.user.id, organizationId);
    return ok(memberships, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load exam memberships";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!hasExamPermission(auth.context)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const parsed = createExamMembershipSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid payload",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const upserted = await examCoreService.upsertMembership(auth.user.id, parsed.data);
    return ok(upserted, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upsert exam membership";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden")
      ? 403
      : lower.includes("limit exceeded")
        ? 409
        : 500;
    const code = status === 403 ? "forbidden" : status === 409 ? "plan_limit_exceeded" : "upsert_failed";
    return fail({ code, message }, status, origin);
  }
}
