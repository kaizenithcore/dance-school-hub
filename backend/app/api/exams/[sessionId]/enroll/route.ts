import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { createExamEnrollmentSchema } from "@/lib/validators/examCoreSchemas";
import { EnrollmentDomainError, examEnrollmentService } from "@/lib/services/examEnrollmentService";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");

  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const parsed = createExamEnrollmentSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid payload",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const enrollment = await examEnrollmentService.enroll(sessionId, parsed.data);
    return ok(enrollment, 201, origin);
  } catch (error) {
    if (error instanceof EnrollmentDomainError) {
      if (error.code === "duplicate_enrollment") {
        return fail({ code: "duplicate_enrollment", message: error.message }, 409, origin);
      }

      if (error.code === "enrollment_out_of_window") {
        return fail({ code: "enrollment_out_of_window", message: error.message }, 409, origin);
      }

      if (error.code === "enrollment_capacity_full") {
        return fail({ code: "enrollment_capacity_full", message: error.message }, 409, origin);
      }
    }

    const message = error instanceof Error ? error.message : "Failed to enroll in exam session";
    const lower = message.toLowerCase();

    if (lower.includes("not found")) {
      return fail({ code: "not_found", message }, 404, origin);
    }

    if (lower.includes("window") || lower.includes("not open") || lower.includes("closed")) {
      return fail({ code: "enrollment_closed", message }, 409, origin);
    }

    if (lower.includes("forbidden") || lower.includes("does not belong") || lower.includes("not a member")) {
      return fail({ code: "forbidden", message }, 403, origin);
    }

    if (lower.includes("limit exceeded")) {
      return fail({ code: "plan_limit_exceeded", message }, 409, origin);
    }

    if (lower.includes("subscription required") || lower.includes("plan") || lower.includes("not enabled")) {
      return fail({ code: "exam_plan_required", message }, 402, origin);
    }

    return fail({ code: "create_failed", message }, 500, origin);
  }
}
