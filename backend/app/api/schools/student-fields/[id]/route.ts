import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { studentFieldService } from "@/lib/services/studentFieldService";
import { studentFieldUpdateSchema } from "@/lib/validators/studentFieldSchemas";

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
    const parsed = studentFieldUpdateSchema.safeParse(body);

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

    const updated = await studentFieldService.updateField(auth.context.tenantId, id, parsed.data);
    return ok(updated, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update student field";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    await studentFieldService.deleteField(auth.context.tenantId, id);
    return ok({ id, deleted: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete student field";
    return fail({ code: "delete_failed", message }, 500, origin);
  }
}
