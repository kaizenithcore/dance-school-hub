import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { enrollmentService } from "@/lib/services/enrollmentService";
import { updateEnrollmentStatusSchema } from "@/lib/validators/enrollmentSchemas";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateEnrollmentStatusSchema.safeParse(body);

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

    const updated = await enrollmentService.updateEnrollmentStatus(
      auth.context.tenantId,
      auth.user.id,
      id,
      parsed.data.status
    );

    return ok(updated, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update enrollment status";

    if (message === "Enrollment not found") {
      return fail({ code: "not_found", message }, 404, origin);
    }

    if (message === "Class capacity exceeded") {
      return fail({ code: "capacity_exceeded", message }, 409, origin);
    }

    if (message.startsWith("Cannot change status")) {
      return fail({ code: "invalid_transition", message }, 409, origin);
    }

    return fail({ code: "update_failed", message }, 500, origin);
  }
}
