import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { studentService } from "@/lib/services/studentService";
import { z } from "zod";

const updateStudentClassesSchema = z.object({
  classIds: z.array(z.string().uuid()),
  jointEnrollmentGroupId: z.string().uuid().nullable().optional(),
});

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateStudentClassesSchema.safeParse(body);

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

    await studentService.updateStudentClasses(auth.context.tenantId, id, parsed.data);
    return ok({ id, updated: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update student classes";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}
