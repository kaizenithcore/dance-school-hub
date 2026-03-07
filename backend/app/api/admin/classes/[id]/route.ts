import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { classService } from "@/lib/services/classService";
import { updateClassSchema } from "@/lib/validators/classSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const classData = await classService.getClass(auth.context.tenantId, id);

    if (!classData) {
      return fail(
        {
          code: "not_found",
          message: "Class not found",
        },
        404,
        origin
      );
    }

    return ok(classData, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch class";
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

export async function PUT(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateClassSchema.safeParse(body);

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

    const classData = await classService.updateClass(
      auth.context.tenantId,
      id,
      parsed.data
    );
    return ok(classData, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update class";
    return fail(
      {
        code: "update_failed",
        message,
      },
      500,
      origin
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    await classService.deleteClass(auth.context.tenantId, id);
    return ok({ deleted: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete class";
    return fail(
      {
        code: "delete_failed",
        message,
      },
      500,
      origin
    );
  }
}
