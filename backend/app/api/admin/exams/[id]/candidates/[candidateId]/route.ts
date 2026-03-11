import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { examService } from "@/lib/services/examService";
import { gradeCandidateSchema, updateCandidateStatusSchema } from "@/lib/validators/examSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{ id: string; candidateId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id, candidateId } = await context.params;
    const body = await request.json();

    // Try grade payload first, then status-only update
    const gradeParsed = gradeCandidateSchema.safeParse(body);

    if (gradeParsed.success) {
      const candidate = await examService.gradeCandidate(
        auth.context.tenantId,
        id,
        candidateId,
        gradeParsed.data
      );
      return ok(candidate, 200, origin);
    }

    const statusParsed = updateCandidateStatusSchema.safeParse(body);

    if (statusParsed.success) {
      const candidate = await examService.updateCandidateStatus(
        auth.context.tenantId,
        id,
        candidateId,
        statusParsed.data
      );
      return ok(candidate, 200, origin);
    }

    return fail(
      {
        code: "invalid_request",
        message: "Invalid payload – provide grades+finalGrade or status",
        details: gradeParsed.error.flatten(),
      },
      400,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update candidate";
    const statusCode = message.includes("not found") ? 404 : 500;
    return fail({ code: "update_failed", message }, statusCode, origin);
  }
}
