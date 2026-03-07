import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { categoryService } from "@/lib/services/disciplineService";
import { createCategorySchema } from "@/lib/validators/teacherSchemas";
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
    const categories = await categoryService.listCategories(auth.context.tenantId);
    return ok(categories, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch categories";
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
    const parsed = createCategorySchema.safeParse(body);

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

    const category = await categoryService.createCategory(auth.context.tenantId, parsed.data);
    return ok(category, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category";
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
