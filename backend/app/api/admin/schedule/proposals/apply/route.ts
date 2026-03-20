import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { scheduleService } from "@/lib/services/scheduleService";
import { applyScheduleProposalSchema } from "@/lib/validators/scheduleProposalSchemas";
import { permissionService, Permission } from "@/lib/services/permissionService";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  // Sprint 7: Only users with SCHEDULE_WRITE can apply proposals
  if (!permissionService.hasPermission(
    { tenantRole: auth.context.role, organizationRole: auth.context.organizationRole },
    Permission.SCHEDULE_WRITE
  )) {
    return fail({ code: "insufficient_permissions", message: "Permisos insuficientes para aplicar propuestas de horario" }, 403, origin);
  }

  try {
    const body = await request.json();
    const parsed = applyScheduleProposalSchema.safeParse(body);

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

    const deletedIds: string[] = [];
    const deleteErrors: string[] = [];

    // Sprint 7: Delete unlocked schedules before applying proposal (replaceUnlocked mode)
    if (parsed.data.schedulesToDelete.length > 0) {
      // Only delete schedules that belong to this tenant and are NOT locked (safety check)
      const { data: toDelete, error: fetchErr } = await supabaseAdmin
        .from("class_schedules")
        .select("id, is_locked")
        .eq("tenant_id", auth.context.tenantId)
        .in("id", parsed.data.schedulesToDelete);

      if (fetchErr) {
        return fail({ code: "delete_fetch_failed", message: fetchErr.message }, 500, origin);
      }

      const safeToDelete = (toDelete || []).filter((s) => !s.is_locked).map((s) => s.id);

      if (safeToDelete.length > 0) {
        const { error: deleteErr } = await supabaseAdmin
          .from("class_schedules")
          .delete()
          .eq("tenant_id", auth.context.tenantId)
          .in("id", safeToDelete);

        if (deleteErr) {
          deleteErrors.push(deleteErr.message);
        } else {
          deletedIds.push(...safeToDelete);
        }
      }
    }

    const result = await scheduleService.saveScheduleBatch(auth.context.tenantId, {
      creates: parsed.data.creates,
      updates: [],
      deletes: [],
    });

    return ok(
      {
        proposalId: parsed.data.proposalId,
        deletedPriorSchedules: deletedIds.length,
        deleteErrors,
        result,
      },
      result.errors.length > 0 ? 207 : 200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply schedule proposal";
    return fail(
      {
        code: "proposal_apply_failed",
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
