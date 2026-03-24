import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { classStudentsParamsSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ classId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const { classId } = await context.params;
  const parsed = classStudentsParamsSchema.safeParse({
    classId,
    tenantId: request.nextUrl.searchParams.get("tenantId") ?? undefined,
  });

  if (!parsed.success) {
    return fail({ code: "invalid_request", message: "Invalid query parameters", details: parsed.error.flatten() }, 400, origin);
  }

  try {
    const data = await portalFoundationService.listTeacherClassStudents(
      auth.userId,
      auth.email,
      parsed.data.classId,
      parsed.data.tenantId
    );
    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load class students";
    const status = message === "Class not assigned to teacher" ? 403 : 500;
    return fail({ code: "fetch_failed", message }, status, origin);
  }
}
