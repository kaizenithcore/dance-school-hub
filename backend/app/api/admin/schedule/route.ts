import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { scheduleService } from "@/lib/services/scheduleService";
import { listSchedulesQuerySchema } from "@/lib/validators/scheduleSchemas";

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = {
      classId: searchParams.get("classId") || undefined,
      roomId: searchParams.get("roomId") || undefined,
      weekday: searchParams.get("weekday") ? parseInt(searchParams.get("weekday")!) : undefined,
      fromDate: searchParams.get("fromDate") || undefined,
      toDate: searchParams.get("toDate") || undefined,
    };

    // Validate query
    const validatedQuery = listSchedulesQuerySchema.parse(query);

    const schedules = await scheduleService.listSchedules(auth.context.tenantId, validatedQuery);

    return ok(schedules, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error listing schedules";
    return fail(
      {
        code: "list_error",
        message,
      },
      400,
      origin
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
