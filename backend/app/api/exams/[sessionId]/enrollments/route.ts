import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireAuth } from "@/lib/auth/requireAuth";
import { examEnrollmentService } from "@/lib/services/examEnrollmentService";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user) {
    return auth.response;
  }

  try {
    const { sessionId } = await context.params;
    const enrollments = await examEnrollmentService.listEnrollments(sessionId, auth.user.id);
    return ok(enrollments, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load session enrollments";
    const lower = message.toLowerCase();

    if (lower.includes("not found")) {
      return fail({ code: "not_found", message }, 404, origin);
    }

    if (lower.includes("forbidden")) {
      return fail({ code: "forbidden", message }, 403, origin);
    }

    if (lower.includes("subscription required") || lower.includes("plan") || lower.includes("not enabled")) {
      return fail({ code: "exam_plan_required", message }, 402, origin);
    }

    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}
