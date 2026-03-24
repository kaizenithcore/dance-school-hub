import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { portalFoundationService } from "@/lib/services/portalFoundationService";
import { createFeedPostSchema, listPublicFeedSchema } from "@/lib/validators/portalFoundationSchemas";
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

  if (!permissionService.canManageCommunications({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const parsed = listPublicFeedSchema.safeParse({
    type: request.nextUrl.searchParams.get("type") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    offset: request.nextUrl.searchParams.get("offset") ?? undefined,
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
    const approvalStatusRaw = request.nextUrl.searchParams.get("approvalStatus") ?? undefined;
    const approvalStatus =
      approvalStatusRaw === "draft" ||
      approvalStatusRaw === "pending_approval" ||
      approvalStatusRaw === "published" ||
      approvalStatusRaw === "rejected"
        ? approvalStatusRaw
        : undefined;

    const data = await portalFoundationService.listSchoolFeedPosts({
      tenantId: auth.context.tenantId,
      type: parsed.data.type,
      approvalStatus,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load school posts";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
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
    const body = await request.json();
    const parsed = createFeedPostSchema.safeParse(body);

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

    const data = await portalFoundationService.createFeedPost(auth.context.tenantId, auth.user.id, parsed.data);
    return ok(data, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create school post";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
