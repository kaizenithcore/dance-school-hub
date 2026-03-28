import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { examSchoolAccessService } from "@/lib/services/examSchoolAccessService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user) {
    return auth.response;
  }

  try {
    const sessions = await examSchoolAccessService.listAvailableForSchool(auth.user.id);
    return ok(sessions, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list available sessions";
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
        code: status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 402 ? "exam_plan_required" : "fetch_failed",
        message,
      },
      status,
      origin
    );
  }
}
