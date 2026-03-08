import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { studentService } from "@/lib/services/studentService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ groupId: string; studentId: string }> }
) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { groupId, studentId } = await context.params;
    await studentService.removeMemberFromJointGroup(auth.context.tenantId, groupId, studentId);
    return ok({ removed: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove member";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}
