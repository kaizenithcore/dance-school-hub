import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { scheduleService } from "@/lib/services/scheduleService";
import { updateScheduleSchema } from "@/lib/validators/scheduleSchemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;
    if (!auth.context) return auth.response;

    const origin = request.headers.get("origin");
    const { id } = await params;
    const tenantId = auth.context.tenantId;

    const schedule = await scheduleService.getSchedule(tenantId, id);

    return ok(schedule, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Horario no encontrado";
    return fail(
      {
        code: "not_found",
        message,
      },
      404,
      request.headers.get("origin")
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;
    if (!auth.context) return auth.response;

    const origin = request.headers.get("origin");
    const { id } = await params;
    const tenantId = auth.context.tenantId;

    const body = await request.json();
    const validatedData = updateScheduleSchema.parse(body);

    const schedule = await scheduleService.updateSchedule(
      tenantId,
      id,
      validatedData
    );

    return ok(schedule, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error updating schedule";
    const statusCode = message.includes("no encontrado") ? 404 : 400;
    return fail(
      {
        code: statusCode === 404 ? "not_found" : "update_error",
        message,
      },
      statusCode,
      request.headers.get("origin")
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;
    if (!auth.context) return auth.response;

    const origin = request.headers.get("origin");
    const { id } = await params;
    const tenantId = auth.context.tenantId;

    await scheduleService.deleteSchedule(tenantId, id);

    return ok({ deleted: true }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error deleting schedule";
    return fail(
      {
        code: "delete_error",
        message,
      },
      400,
      request.headers.get("origin")
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
