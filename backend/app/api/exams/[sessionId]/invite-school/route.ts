import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { inviteSchoolToExamSessionSchema } from "@/lib/validators/examCoreSchemas";
import { examSchoolAccessService } from "@/lib/services/examSchoolAccessService";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!permissionService.canManageExams({ tenantRole: auth.context.role, organizationRole: auth.context.organizationRole })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const parsed = inviteSchoolToExamSessionSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const invited = await examSchoolAccessService.inviteSchool(sessionId, auth.user.id, parsed.data);
    return ok(invited, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to invite school";
    const lower = message.toLowerCase();
    const status = lower.includes("forbidden")
      ? 403
      : lower.includes("not found")
        ? 404
        : lower.includes("plan") || lower.includes("subscription") || lower.includes("not enabled")
          ? 402
          : 500;

    return fail(
      {
        code: status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 402 ? "exam_plan_required" : "invite_failed",
        message,
      },
      status,
      origin
    );
  }
}
