import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { incidentService } from "@/lib/services/incidentService";
import { updateIncidentSchema } from "@/lib/validators/incidentSchemas";

interface RouteContext {
  params: Promise<{ incidentId: string }>;
}

function canManageIncidents(role: string) {
  return role === "owner" || role === "admin" || role === "staff";
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!canManageIncidents(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const { incidentId } = await context.params;
    const body = await request.json();
    const parsed = updateIncidentSchema.safeParse(body);

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

    const incident = await incidentService.updateIncident(auth.context.tenantId, auth.user.id, incidentId, parsed.data);
    return ok(incident, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update incident";
    const status = message.includes("not found") ? 404 : 500;
    return fail({ code: "update_failed", message }, status, origin);
  }
}
