import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { teacherPostSchema } from "@/lib/validators/portalFoundationSchemas";
import { portalFoundationService } from "@/lib/services/portalFoundationService";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = teacherPostSchema.safeParse(body);

    if (!parsed.success) {
      return fail({ code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() }, 400, origin);
    }

    const data = await portalFoundationService.createTeacherPost(auth.userId, auth.email, parsed.data);
    return ok(data, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create teacher post";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
