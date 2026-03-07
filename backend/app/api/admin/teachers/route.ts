import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { teacherService } from "@/lib/services/teacherService";
import { createTeacherSchema } from "@/lib/validators/teacherSchemas";
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
    const teachers = await teacherService.listTeachers(auth.context.tenantId);
    return ok(teachers, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch teachers";
    return fail(
      {
        code: "fetch_failed",
        message,
      },
      500,
      origin
    );
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
    const parsed = createTeacherSchema.safeParse(body);

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

    const teacher = await teacherService.createTeacher(auth.context.tenantId, parsed.data);
    return ok(teacher, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create teacher";
    return fail(
      {
        code: "create_failed",
        message,
      },
      500,
      origin
    );
  }
}
