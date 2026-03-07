import { fail, ok } from "@/lib/http";
import { tenantService } from "@/lib/services/tenantService";
import { createTenantSchema } from "@/lib/validators/tenantSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try {
    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid payload.",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const created = await tenantService.createTenant(parsed.data);

    return ok(
      {
        tenantId: created.tenantId,
        tenantSlug: created.tenantSlug,
        ownerUserId: created.ownerUserId,
        role: created.role,
      },
      201,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.toLowerCase().includes("already in use")) {
      return fail(
        {
          code: "tenant_slug_conflict",
          message,
        },
        409,
        origin
      );
    }

    if (message.toLowerCase().includes("user") || message.toLowerCase().includes("email")) {
      return fail(
        {
          code: "owner_creation_failed",
          message,
        },
        400,
        origin
      );
    }

    return fail(
      {
        code: "tenant_creation_failed",
        message,
      },
      500,
      origin
    );
  }
}