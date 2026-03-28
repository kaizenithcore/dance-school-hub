import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { examAnalyticsQuerySchema } from "@/lib/validators/examCoreSchemas";
import { examAnalyticsService } from "@/lib/services/examAnalyticsService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!permissionService.canManageExams({ tenantRole: auth.context.role, organizationRole: auth.context.organizationRole })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const parsed = examAnalyticsQuerySchema.safeParse({
    organization_id: request.nextUrl.searchParams.get("organization_id") || undefined,
    from: request.nextUrl.searchParams.get("from") || undefined,
    to: request.nextUrl.searchParams.get("to") || undefined,
    persist: request.nextUrl.searchParams.get("persist") || undefined,
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
    const analytics = await examAnalyticsService.getAnalytics(auth.user.id, parsed.data);
    return ok(analytics, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exam analytics";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden")
      ? 403
      : lower.includes("not found")
        ? 404
        : lower.includes("subscription required") || lower.includes("plan") || lower.includes("not enabled")
          ? 402
          : 500;

    return fail(
      {
        code: status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 402 ? "exam_plan_required" : "fetch_failed",
        message,
      },
      status,
      origin
    );
  }
}
