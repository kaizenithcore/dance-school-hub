import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { examService } from "@/lib/services/examService";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const count = await examService.generateAllCertificates(auth.context.tenantId, id);
    return ok({ generated: count }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate certificates";
    return fail({ code: "generate_failed", message }, 500, origin);
  }
}
