import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { courseCloneService } from "@/lib/services/courseCloneService";

function canManageClone(role: string) {
  return role === "owner" || role === "admin";
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

  if (!canManageClone(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const jobs = await courseCloneService.listCloneJobs(auth.context.tenantId);
    return ok(jobs, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load clone jobs";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!canManageClone(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const action = body?.action === "apply" ? "apply" : "dry_run";
    const sourcePeriod = typeof body?.sourcePeriod === "string" ? body.sourcePeriod : "";
    const targetPeriod = typeof body?.targetPeriod === "string" ? body.targetPeriod : "";

    if (!sourcePeriod || !targetPeriod) {
      return fail({ code: "invalid_request", message: "sourcePeriod and targetPeriod are required" }, 400, origin);
    }

    if (action === "dry_run") {
      const result = await courseCloneService.dryRun(auth.context.tenantId, sourcePeriod, targetPeriod);
      return ok(result, 200, origin);
    }

    const result = await courseCloneService.applyClone({
      tenantId: auth.context.tenantId,
      actorUserId: auth.user.id,
      sourcePeriod,
      targetPeriod,
    });

    return ok(result, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process course clone";
    return fail({ code: "process_failed", message }, 500, origin);
  }
}
