import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { studentFieldService } from "@/lib/services/studentFieldService";
import { studentFieldInputSchema } from "@/lib/validators/studentFieldSchemas";

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
    const fields = await studentFieldService.listFields(auth.context.tenantId);
    return ok(fields, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch student fields";
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
    const parsed = studentFieldInputSchema.safeParse(body);

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

    const created = await studentFieldService.createField(auth.context.tenantId, parsed.data);
    return ok(created, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create student field";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
