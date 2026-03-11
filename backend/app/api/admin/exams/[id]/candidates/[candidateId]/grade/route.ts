import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { examService } from "@/lib/services/examService";
import { gradeCandidateSchema } from "@/lib/validators/examSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{ id: string; candidateId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id, candidateId } = await context.params;
    const body = await request.json();
    const parsed = gradeCandidateSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        { code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() },
        400,
        origin
      );
    }

    const candidate = await examService.gradeCandidate(
      auth.context.tenantId,
      id,
      candidateId,
      parsed.data
    );
    return ok(candidate, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save grade";
    const statusCode = message.includes("not found") ? 404 : 500;
    return fail({ code: "grade_failed", message }, statusCode, origin);
  }
}
