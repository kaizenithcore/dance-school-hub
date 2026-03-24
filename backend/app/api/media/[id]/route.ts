import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { portalFoundationService } from "@/lib/services/portalFoundationService";
import { mediaAssetIdSchema } from "@/lib/validators/portalFoundationSchemas";
import { permissionService } from "@/lib/services/permissionService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!permissionService.canManageCommunications({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const { id } = await context.params;
  const parsed = mediaAssetIdSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid media id",
        details: parsed.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const data = await portalFoundationService.getMediaAsset(auth.context.tenantId, parsed.data.id);
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load media";
    const status = message === "Media not found" ? 404 : 500;
    return fail({ code: "fetch_failed", message }, status, origin);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!permissionService.canManageCommunications({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const { id } = await context.params;
  const parsed = mediaAssetIdSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid media id",
        details: parsed.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const data = await portalFoundationService.deleteMediaAsset(auth.context.tenantId, parsed.data.id);
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete media";
    const status = message === "Media not found" ? 404 : 500;
    return fail({ code: "delete_failed", message }, status, origin);
  }
}
