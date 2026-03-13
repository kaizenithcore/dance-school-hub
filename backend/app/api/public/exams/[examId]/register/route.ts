import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { registerCandidateSchema } from "@/lib/validators/examSuiteSchemas";
import { examSuiteService } from "@/lib/services/examSuiteService";

interface RouteContext {
  params: Promise<{ examId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");

  try {
    const { examId } = await context.params;
    const body = await request.json();
    const parsed = registerCandidateSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const candidate = await examSuiteService.registerCandidatePublic(examId, parsed.data);
    return ok(candidate, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register candidate";

    if (message.includes("invalid input syntax for type uuid") || message.includes("invalid uuid")) {
      return fail({ code: "invalid_request", message: "Invalid examId" }, 400, origin);
    }

    if (message.includes("not found")) {
      return fail({ code: "not_found", message }, 404, origin);
    }

    if (message.includes("Registration") || message.includes("max candidates") || message.includes("capacity")) {
      return fail({ code: "registration_closed", message }, 409, origin);
    }

    return fail({ code: "create_failed", message }, 500, origin);
  }
}
