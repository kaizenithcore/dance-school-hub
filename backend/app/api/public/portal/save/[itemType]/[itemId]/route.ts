import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { saveItemParamsSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ itemType: string; itemId: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const routeParams = await context.params;
  const parsed = saveItemParamsSchema.safeParse(routeParams);

  if (!parsed.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid save item params",
        details: parsed.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const result = await portalFoundationService.saveItem(auth.userId, parsed.data);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save item";
    return fail({ code: "save_failed", message }, 400, origin);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const routeParams = await context.params;
  const parsed = saveItemParamsSchema.safeParse(routeParams);

  if (!parsed.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid save item params",
        details: parsed.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const result = await portalFoundationService.unsaveItem(auth.userId, parsed.data);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unsave item";
    return fail({ code: "unsave_failed", message }, 400, origin);
  }
}
