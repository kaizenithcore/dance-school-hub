import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { followSchoolParamsSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
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

  const parsedParams = followSchoolParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid tenant id",
        details: parsedParams.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const result = await portalFoundationService.followSchool(auth.userId, parsedParams.data.tenantId);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to follow school";
    return fail({ code: "follow_failed", message }, 400, origin);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const parsedParams = followSchoolParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid tenant id",
        details: parsedParams.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const result = await portalFoundationService.unfollowSchool(auth.userId, parsedParams.data.tenantId);
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unfollow school";
    return fail({ code: "unfollow_failed", message }, 400, origin);
  }
}
