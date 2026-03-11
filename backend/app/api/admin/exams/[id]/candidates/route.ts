import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { examService } from "@/lib/services/examService";
import { registerCandidateSchema } from "@/lib/validators/examSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const candidates = await examService.listCandidates(auth.context.tenantId, id);
    return ok(candidates, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch candidates";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = registerCandidateSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        { code: "invalid_request", message: "Invalid payload", details: parsed.error.flatten() },
        400,
        origin
      );
    }

    const candidate = await examService.registerCandidate(
      auth.context.tenantId,
      id,
      parsed.data
    );
    return ok(candidate, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register candidate";
    const statusCode = message.includes("not found") ? 404 : message.includes("capacity") ? 409 : 500;
    return fail({ code: "register_failed", message }, statusCode, origin);
  }
}
