import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { getAccessTokenFromRequest } from "@/lib/auth/tenantContext";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { listPublicFeedSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

async function resolveFeedViewerContext(request: NextRequest): Promise<{ viewerUserId?: string; viewerTenantIds: string[] }> {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return { viewerTenantIds: [] };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return { viewerTenantIds: [] };
  }

  const { data: memberships } = await supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const viewerTenantIds = Array.from(
    new Set((memberships ?? []).map((row) => row.tenant_id as string).filter((value) => typeof value === "string"))
  );

  return {
    viewerUserId: user.id,
    viewerTenantIds,
  };
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");

  const parsed = listPublicFeedSchema.safeParse({
    tenantId: request.nextUrl.searchParams.get("tenantId") ?? undefined,
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
    const viewer = await resolveFeedViewerContext(request);
    const result = await portalFoundationService.listPublicFeed({
      ...parsed.data,
      viewerUserId: viewer.viewerUserId,
      viewerTenantIds: viewer.viewerTenantIds,
    });
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch public feed";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
