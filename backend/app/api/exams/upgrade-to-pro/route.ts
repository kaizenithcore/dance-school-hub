import type { NextRequest } from "next/server";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { upgradeExamToProSchema } from "@/lib/validators/examCoreSchemas";
import { examUpgradeService } from "@/lib/services/examUpgradeService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = upgradeExamToProSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const result = await examUpgradeService.upgradeToPro({
      actorUserId: auth.userId,
      payload: parsed.data,
      origin,
    });

    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upgrade ExamSuit to Pro";
    const lower = message.toLowerCase();

    const status = lower.includes("forbidden")
      ? 403
      : lower.includes("not found")
        ? 404
        : 500;

    return fail(
      {
        code: status === 403 ? "forbidden" : status === 404 ? "not_found" : "upgrade_failed",
        message,
      },
      status,
      origin
    );
  }
}
