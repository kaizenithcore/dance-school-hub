import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { studentPortalService } from "@/lib/services/studentPortalService";
import { eventIdParamSchema } from "@/lib/validators/studentPortalSchemas";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = eventIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid event id",
        details: parsedParams.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const result = await studentPortalService.confirmEventAttendance(auth.userId, parsedParams.data.id);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to confirm event attendance";
    const status = message === "Event not found" ? 404 : message === "Student context not found" ? 404 : 500;
    return fail({ code: "update_failed", message }, status, origin);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const params = await context.params;
  const parsedParams = eventIdParamSchema.safeParse(params);

  if (!parsedParams.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid event id",
        details: parsedParams.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const result = await studentPortalService.cancelEventAttendance(auth.userId, parsedParams.data.id);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel event attendance";
    const status = message === "Student context not found" ? 404 : 500;
    return fail({ code: "update_failed", message }, status, origin);
  }
}
