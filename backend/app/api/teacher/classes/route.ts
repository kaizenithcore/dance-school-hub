import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { teacherListSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const parsed = teacherListSchema.safeParse({
    tenantId: request.nextUrl.searchParams.get("tenantId") ?? undefined,
  });

  if (!parsed.success) {
    return fail({ code: "invalid_request", message: "Invalid query parameters", details: parsed.error.flatten() }, 400, origin);
  }

  try {
    const data = await portalFoundationService.listTeacherClasses(auth.userId, auth.email, parsed.data.tenantId);
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load teacher classes";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
