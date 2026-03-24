import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import { corsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { requireUserAuth } from "@/lib/auth/requireUserAuth";
import { studentPortalService } from "@/lib/services/studentPortalService";
import { buildIcalCalendar, type IcalEvent } from "@/lib/services/icalExportService";

const WEEKDAY_BY_NUMBER: Record<number, string> = {
  1: "MO",
  2: "TU",
  3: "WE",
  4: "TH",
  5: "FR",
  6: "SA",
  7: "SU",
};

function parseTime(time: string): [number, number] {
  const [hourRaw, minuteRaw] = String(time || "00:00").split(":");
  const hour = Number.parseInt(hourRaw || "0", 10);
  const minute = Number.parseInt(minuteRaw || "0", 10);
  return [Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0];
}

function buildDateAtTime(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireUserAuth(request);

  if (!auth.authorized || !auth.userId) {
    return auth.response;
  }

  try {
    const calendarData = await studentPortalService.getStudentCalendarData(auth.userId);
    const events: IcalEvent[] = [];

    for (const scheduleItem of calendarData.weeklySchedule) {
      const [hour, minute] = parseTime(scheduleItem.startTime);
      const [endHour, endMinute] = parseTime(scheduleItem.endTime);
      const start = buildDateAtTime(hour, minute);
      const end = buildDateAtTime(endHour, endMinute);
      const byDay = WEEKDAY_BY_NUMBER[scheduleItem.weekday];

      events.push({
        uid: `class-${scheduleItem.classId}-${scheduleItem.weekday}-${scheduleItem.startTime}@dance-school-hub`,
        summary: scheduleItem.className,
        description: `Profesor: ${scheduleItem.teacher}`,
        location: scheduleItem.room,
        start,
        end,
        rrule: byDay ? `FREQ=WEEKLY;BYDAY=${byDay}` : undefined,
      });
    }

    for (const eventItem of calendarData.events) {
      const start = new Date(`${eventItem.startDate}T09:00:00`);
      const end = eventItem.endDate ? new Date(`${eventItem.endDate}T18:00:00`) : new Date(`${eventItem.startDate}T18:00:00`);
      events.push({
        uid: `event-${eventItem.id}@dance-school-hub`,
        summary: eventItem.name,
        description: eventItem.description || undefined,
        location: eventItem.location,
        start,
        end,
        allDay: true,
      });
    }

    const content = buildIcalCalendar(`${calendarData.student.name} - Portal Alumno`, events);
    const filename = `portal-calendar-${calendarData.student.id}.ics`;

    return new Response(content, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export calendar";
    const status = message === "Student context not found" ? 404 : 500;
    return fail({ code: "export_failed", message }, status, origin);
  }
}
