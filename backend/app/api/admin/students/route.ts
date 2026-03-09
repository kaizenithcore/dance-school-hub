import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { studentService } from "@/lib/services/studentService";
import { StudentLimitError } from "@/lib/services/studentQuotaService";
import { createStudentSchema } from "@/lib/validators/studentSchemas";

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
    const students = await studentService.listStudents(auth.context.tenantId);
    return ok(students, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch students";
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
    const parsed = createStudentSchema.safeParse(body);

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

    const created = await studentService.createStudent(auth.context.tenantId, parsed.data);
    return ok(created, 201, origin);
  } catch (error) {
    if (error instanceof StudentLimitError) {
      return fail(
        {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        409,
        origin
      );
    }

    const message = error instanceof Error ? error.message : "Failed to create student";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
