import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { portalFoundationService } from "@/lib/services/portalFoundationService";
import { uploadMediaFromUrlSchema } from "@/lib/validators/portalFoundationSchemas";
import { permissionService } from "@/lib/services/permissionService";

function parseMediaKind(value: FormDataEntryValue | null): "image" | "video" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (value === "image" || value === "video") {
    return value;
  }

  return undefined;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user?.id) {
    return auth.response;
  }

  if (!permissionService.canManageCommunications({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fileEntry = formData.get("file");
      const file = fileEntry instanceof File ? fileEntry : null;

      if (!file || file.size === 0) {
        return fail({ code: "invalid_request", message: "Missing file field" }, 400, origin);
      }

      const kind = parseMediaKind(formData.get("kind"));
      const isPublicRaw = formData.get("isPublic");
      const isPublic = typeof isPublicRaw === "string" ? isPublicRaw !== "false" : true;

      const data = await portalFoundationService.uploadMediaAssetFile({
        tenantId: auth.context.tenantId,
        actorUserId: auth.user.id,
        file,
        kind,
        isPublic,
      });

      return ok(data, 201, origin);
    }

    const body = await request.json();
    const parsed = uploadMediaFromUrlSchema.safeParse(body);

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

    const data = await portalFoundationService.createMediaAssetFromUrl(
      auth.context.tenantId,
      auth.user.id,
      parsed.data
    );

    return ok(data, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload media";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
