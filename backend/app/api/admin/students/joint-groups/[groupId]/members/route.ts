import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { studentService } from "@/lib/services/studentService";
import { z } from "zod";

const addMemberSchema = z.object({
  studentId: z.string().uuid(),
});

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: { params: Promise<{ groupId: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { groupId } = await context.params;
    const members = await studentService.getJointGroupMembers(auth.context.tenantId, groupId);
    return ok(members, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch group members";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ groupId: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { groupId } = await context.params;
    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);

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

    await studentService.addMemberToJointGroup(auth.context.tenantId, groupId, parsed.data.studentId);
    return ok({ added: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add member";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}
