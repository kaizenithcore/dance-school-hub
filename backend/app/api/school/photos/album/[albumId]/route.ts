import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { listPhotosByAlbumSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ albumId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");

  const { albumId } = await context.params;
  const parsed = listPhotosByAlbumSchema.safeParse({
    albumId,
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
    const tenantId = request.nextUrl.searchParams.get("tenantId") ?? undefined;
    const data = await portalFoundationService.listPhotosByAlbum({
      tenantId,
      albumId: parsed.data.albumId,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load photos";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
