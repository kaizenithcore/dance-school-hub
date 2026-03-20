import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { schedulerProposalService } from "@/lib/services/schedulerProposalService";
import { generateScheduleProposalsSchema } from "@/lib/validators/scheduleProposalSchemas";
import { permissionService, Permission } from "@/lib/services/permissionService";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  // Sprint 7: Only users with SCHEDULE_WRITE can generate proposals
  if (!permissionService.hasPermission(
    { tenantRole: auth.context.role, organizationRole: auth.context.organizationRole },
    Permission.SCHEDULE_WRITE
  )) {
    return fail({ code: "insufficient_permissions", message: "Permisos insuficientes para generar propuestas de horario" }, 403, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = generateScheduleProposalsSchema.safeParse(body);

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

    const result = await schedulerProposalService.generate(
      auth.context.tenantId,
      parsed.data.replaceUnlocked,
    );
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate schedule proposals";
    return fail(
      {
        code: "proposal_generate_failed",
        message,
      },
      500,
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
