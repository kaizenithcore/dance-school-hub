import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { classService } from "@/lib/services/classService";
import { createClassSchema } from "@/lib/validators/classSchemas";
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
    const classes = await classService.listClasses(auth.context.tenantId);
    return ok(classes, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch classes";
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

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = createClassSchema.safeParse(body);

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

    const classData = await classService.createClass(
      auth.context.tenantId,
      auth.user.id,
      parsed.data
    );
    return ok(classData, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create class";
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
