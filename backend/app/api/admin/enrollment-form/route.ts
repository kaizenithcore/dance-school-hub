import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { enrollmentFormConfigService } from "@/lib/services/enrollmentFormConfigService";
import { permissionService } from "@/lib/services/permissionService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const config = await enrollmentFormConfigService.getByTenantId(auth.context.tenantId);
    return ok({ config }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch enrollment form config";
    return fail(
      {
        code: "fetch_failed",
        message,
      },
      500,
      origin
    );
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!permissionService.canManageSettings({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail(
      {
        code: "forbidden",
        message: "Insufficient permissions",
      },
      403,
      origin
    );
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || !("config" in body)) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid payload. Expected { config }",
        },
        400,
        origin
      );
    }

    const saved = await enrollmentFormConfigService.saveForTenant(
      auth.context.tenantId,
      auth.user.id,
      (body as { config: unknown }).config
    );

    return ok(saved, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save enrollment form config";
    return fail(
      {
        code: "save_failed",
        message,
      },
      500,
      origin
    );
  }
}
