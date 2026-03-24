import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { searchPublicSchoolsSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");

  const parsed = searchPublicSchoolsSchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    city: request.nextUrl.searchParams.get("city") ?? undefined,
    level: request.nextUrl.searchParams.get("level") ?? undefined,
    minStudents: request.nextUrl.searchParams.get("minStudents") ?? undefined,
    maxStudents: request.nextUrl.searchParams.get("maxStudents") ?? undefined,
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
    const result = await portalFoundationService.searchPublicSchools(parsed.data);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search schools";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
