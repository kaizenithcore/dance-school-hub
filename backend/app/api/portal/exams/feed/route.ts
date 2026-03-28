import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { listPaginationSchema } from "@/lib/validators/studentPortalSchemas";
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

  const parsed = listPaginationSchema.safeParse({
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
    await examPortalService.assertUserHasExamPlan(auth.userId, "lite");
    const result = await examPortalService.getExamFeed(auth.userId, parsed.data);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exam portal feed";
    const lower = message.toLowerCase();
    const status = lower.includes("subscription required") || lower.includes("plan") || lower.includes("not enabled")
      ? 402
      : 500;
    return fail({ code: status === 402 ? "exam_plan_required" : "fetch_failed", message }, status, origin);
  }
}
