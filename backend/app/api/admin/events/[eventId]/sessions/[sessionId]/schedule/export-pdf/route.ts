import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { eventService } from "@/lib/services/eventService";
import { eventScheduleItemService } from "@/lib/services/eventScheduleItemService";
import { eventSchedulePdfService } from "@/lib/services/eventSchedulePdfService";
import { handleCorsPreFlight } from "@/lib/cors";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

interface RouteContext {
  params: Promise<{
    eventId: string;
    sessionId: string;
  }>;
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
    const { eventId, sessionId } = await context.params;

    // Fetch event
    const event = await eventService.getEvent(auth.context.tenantId, eventId);
    if (!event) {
      return fail(
        {
          code: "not_found",
          message: "Event not found",
        },
        404,
        origin
      );
    }

    // Fetch session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("event_sessions")
      .select("id, event_id, date, start_time, end_time, name, notes, position")
      .eq("tenant_id", auth.context.tenantId)
      .eq("event_id", eventId)
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      return fail(
        {
          code: "not_found",
          message: "Session not found",
        },
        404,
        origin
      );
    }

    // Fetch schedule items
    const scheduleItems = await eventScheduleItemService.listScheduleItems(
      auth.context.tenantId,
      eventId,
      sessionId
    );

    // Prepare data for PDF service
    const eventData = {
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      location: event.location,
    };

    const session = {
      id: sessionData.id,
      date: sessionData.date,
      startTime: sessionData.start_time,
      name: sessionData.name || undefined,
    };

    // Generate PDF
    const pdf = await eventSchedulePdfService.generateSchedulePdf(
      auth.context.tenantId,
      eventData,
      session,
      scheduleItems
    );

    // Return PDF
    const response = new Response(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="escaleta-${event.name.replace(/\s+/g, "-")}-${sessionData.date}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

    // Add CORS headers
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate schedule PDF";
    console.error("PDF generation error:", error);
    return fail(
      {
        code: "generation_failed",
        message,
      },
      500,
      origin
    );
  }
}
