import { z } from "zod";
import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { enrollmentCheckoutSchema } from "@/lib/validators/studentPortalSchemas";
import { studentPortalService } from "@/lib/services/studentPortalService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  const routeParams = paramsSchema.safeParse(await context.params);
  if (!routeParams.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid enrollment id",
        details: routeParams.error.flatten(),
      },
      400,
      origin
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsedBody = enrollmentCheckoutSchema.safeParse(body);
  if (!parsedBody.success) {
    return fail(
      {
        code: "invalid_request",
        message: "Invalid checkout payload",
        details: parsedBody.error.flatten(),
      },
      400,
      origin
    );
  }

  try {
    const data = await studentPortalService.createEnrollmentCheckoutSession(auth.userId, routeParams.data.id, {
      successUrl: parsedBody.data.successUrl,
      cancelUrl: parsedBody.data.cancelUrl,
      fallbackBaseUrl: request.nextUrl.origin,
    });

    return ok(data, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    const status =
      message === "Enrollment not found" || message === "Student context not found"
        ? 404
        : message.includes("Stripe")
          ? 503
          : 500;

    return fail({ code: "checkout_failed", message }, status, origin);
  }
}
