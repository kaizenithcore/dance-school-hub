import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { incidentService } from "@/lib/services/incidentService";
import { createIncidentSchema, listIncidentsQuerySchema } from "@/lib/validators/incidentSchemas";

function canManageIncidents(role: string) {
  return role === "owner" || role === "admin" || role === "staff";
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!canManageIncidents(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const query = {
      fromDate: request.nextUrl.searchParams.get("fromDate") || undefined,
      toDate: request.nextUrl.searchParams.get("toDate") || undefined,
      status: request.nextUrl.searchParams.get("status") || undefined,
      studentId: request.nextUrl.searchParams.get("studentId") || undefined,
      limit: request.nextUrl.searchParams.get("limit") || undefined,
    };

    const parsed = listIncidentsQuerySchema.safeParse(query);
    if (!parsed.success) {
      return fail(
        {
          code: "invalid_query",
          message: "Invalid query",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const incidents = await incidentService.listIncidents(auth.context.tenantId, parsed.data);
    return ok(incidents, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list incidents";
    return fail({ code: "list_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!canManageIncidents(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const parsed = createIncidentSchema.safeParse(body);

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

    const incident = await incidentService.createIncident(auth.context.tenantId, auth.user.id, parsed.data);
    return ok(incident, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create incident";
    const status = message.includes("not found") ? 404 : 500;
    return fail({ code: "create_failed", message }, status, origin);
  }
}
