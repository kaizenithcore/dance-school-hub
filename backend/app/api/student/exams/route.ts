import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { studentPortalService } from "@/lib/services/studentPortalService";
import { examPortalService } from "@/lib/services/examPortalService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  try {
    await examPortalService.assertUserHasExamPlan(auth.userId, "lite");
    const result = await studentPortalService.getStudentExams(auth.userId);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch student exams";
    const lower = message.toLowerCase();
    const status = message === "Student context not found"
      ? 404
      : lower.includes("subscription required") || lower.includes("plan") || lower.includes("not enabled")
        ? 402
        : 500;
    return fail({ code: status === 402 ? "exam_plan_required" : "fetch_failed", message }, status, origin);
  }
}
