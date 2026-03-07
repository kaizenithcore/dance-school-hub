import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { roomService } from "@/lib/services/roomService";
import { createRoomSchema } from "@/lib/validators/roomSchemas";
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
    const rooms = await roomService.listRooms(auth.context.tenantId);
    return ok(rooms, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch rooms";
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
    const parsed = createRoomSchema.safeParse(body);

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

    const room = await roomService.createRoom(auth.context.tenantId, parsed.data);
    return ok(room, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room";
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
