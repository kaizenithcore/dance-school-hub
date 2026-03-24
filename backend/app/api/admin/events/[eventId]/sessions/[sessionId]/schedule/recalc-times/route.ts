import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { scheduleValidationService } from "@/lib/services/scheduleValidationService";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { handleCorsPreFlight } from "@/lib/cors";

interface RouteContext {
  params: Promise<{
    eventId: string;
    sessionId: string;
  }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

/**
 * Recalculate all schedule item times in a session based on start times and durations
 * Fills in any null start_times with calculated values
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const { eventId, sessionId } = await context.params;
    const tenantId = auth.context.tenantId;

    // Verify session belongs to event and tenant
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("event_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (sessionError || !session) {
      return fail(
        {
          code: "not_found",
          message: "Session not found or unauthorized",
        },
        404,
        origin
      );
    }

    // Recalculate all times
    const updates = await scheduleValidationService.recalculateSessionTimes(
      sessionId,
      tenantId
    );

    // Batch update all items
    const updatePromises = updates.map((update) =>
      supabaseAdmin
        .from("event_schedule_items")
        .update({ start_time: update.start_time })
        .eq("id", update.id)
        .eq("tenant_id", tenantId)
    );

    const results = await Promise.all(updatePromises);

    for (const result of results) {
      if (result.error) {
        throw new Error(`Failed to update times: ${result.error.message}`);
      }
    }

    return ok(
      {
        success: true,
        itemsUpdated: updates.length,
      },
      200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to recalculate times";
    return fail(
      {
        code: "recalc_failed",
        message,
      },
      500,
      origin
    );
  }
}
