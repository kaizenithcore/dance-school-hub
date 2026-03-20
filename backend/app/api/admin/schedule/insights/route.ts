import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { scheduleInsightsService } from "@/lib/services/scheduleInsightsService";
import { permissionService, Permission } from "@/lib/services/permissionService";

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    // Sprint 6: Permission check - require schedule read access for insights
    if (!permissionService.hasPermission(
      {
        tenantRole: auth.context.role,
        organizationRole: auth.context.organizationRole,
      },
      Permission.SCHEDULE_READ
    )) {
      return fail(
        {
          code: "insufficient_permissions",
          message: "Solo administradores y gestores pueden ver análisis de horarios",
        },
        403,
        origin
      );
    }

    const insights = await scheduleInsightsService.getInsights(auth.context.tenantId);
    return ok(insights, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate schedule insights";
    return fail(
      {
        code: "schedule_insights_failed",
        message,
      },
      500,
      origin
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
