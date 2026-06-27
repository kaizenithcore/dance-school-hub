import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { courseCloneService } from "@/lib/services/courseCloneService";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

/** GET ?sourceYearId=&targetYearId= — preview what would be cloned */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.context) return auth.response;

  const sourceYearId = request.nextUrl.searchParams.get("sourceYearId") || "";
  const targetYearId = request.nextUrl.searchParams.get("targetYearId") || "";
  if (!sourceYearId || !targetYearId) {
    return fail({ code: "invalid_request", message: "sourceYearId y targetYearId son requeridos" }, 400, origin);
  }

  try {
    const preview = await courseCloneService.preview(auth.context.tenantId, sourceYearId, targetYearId);
    return ok(preview, 200, origin);
  } catch (error) {
    return fail({ code: "preview_failed", message: error instanceof Error ? error.message : "Error al previsualizar" }, 500, origin);
  }
}

/** POST { sourceYearId, targetYearId } — execute the clone */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.context || !auth.user) return auth.response;

  try {
    const body = await request.json();
    const sourceYearId = typeof body?.sourceYearId === "string" ? body.sourceYearId : "";
    const targetYearId = typeof body?.targetYearId === "string" ? body.targetYearId : "";
    if (!sourceYearId || !targetYearId) {
      return fail({ code: "invalid_request", message: "sourceYearId y targetYearId son requeridos" }, 400, origin);
    }
    if (sourceYearId === targetYearId) {
      return fail({ code: "invalid_request", message: "El curso origen y destino no pueden ser el mismo" }, 400, origin);
    }

    const result = await courseCloneService.cloneYear({
      tenantId: auth.context.tenantId,
      actorUserId: auth.user.id,
      sourceYearId,
      targetYearId,
    });
    return ok(result, 201, origin);
  } catch (error) {
    return fail({ code: "clone_failed", message: error instanceof Error ? error.message : "Error al clonar el curso" }, 500, origin);
  }
}
