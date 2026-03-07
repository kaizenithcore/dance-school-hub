import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { publicEnrollmentService } from "@/lib/services/publicEnrollmentService";
import { handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: { params: Promise<{ tenantSlug: string }> }) {
  const params = await context.params;
  const origin = request.headers.get("origin");

  try {
    const formData = await publicEnrollmentService.getFormData(params.tenantSlug);

    if (!formData) {
      return fail(
        {
          code: "not_found",
          message: "Tenant not found or inactive",
        },
        404,
        origin
      );
    }

    return ok(formData, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch form data";
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
