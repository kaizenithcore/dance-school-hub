import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { examService } from "@/lib/services/examService";
import { createExamSchema } from "@/lib/validators/examSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const exams = await examService.listExams(auth.context.tenantId);
    return ok(exams, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exams";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = createExamSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        { code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() },
        400,
        origin
      );
    }

    const exam = await examService.createExam(
      auth.context.tenantId,
      auth.context.userId,
      parsed.data
    );
    return ok(exam, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create exam";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
