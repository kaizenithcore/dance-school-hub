import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { reportIdParamsSchema, updateContentReportSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function canManagePortal(role: string | null | undefined) {
  return role === "owner" || role === "admin" || role === "staff";
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user?.id) {
    return auth.response;
  }

  if (!canManagePortal(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient role" }, 403, origin);
  }

  const parsedParams = reportIdParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid report id",
        details: parsedParams.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = updateContentReportSchema.safeParse(body);

    if (!parsedBody.success) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid payload",
          details: parsedBody.error.flatten(),
        },
        400,
        origin
      );
    }

    const result = await portalFoundationService.updateContentReport(
      auth.context.tenantId,
      auth.user.id,
      parsedParams.data.id,
      parsedBody.data
    );

    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update report";
    const status = message === "Report not found" ? 404 : 500;
    return fail({ code: "update_failed", message }, status, origin);
  }
}
