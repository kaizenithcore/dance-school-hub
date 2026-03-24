import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { publicEnrollmentService } from "@/lib/services/publicEnrollmentService";
import { buildIcalCalendar, type IcalEvent } from "@/lib/services/icalExportService";

interface PublicEventItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  location: string;
  description: string | null;
  status: "published";
}

const WEEKDAY_BY_SPANISH_DAY: Record<string, string> = {
  lunes: "MO",
  martes: "TU",
  miercoles: "WE",
  miércoles: "WE",
  jueves: "TH",
  viernes: "FR",
  sabado: "SA",
  sábado: "SA",
  domingo: "SU",
};

function parseHourToDate(hour: number): Date {
  const now = new Date();
  now.setHours(hour, 0, 0, 0);
  return now;
}

export const publicIntegrationsService = {
  async listPublishedEvents(tenantSlug: string, limit = 50): Promise<{ tenantId: string; tenantName: string; events: PublicEventItem[] } | null> {
    const formData = await publicEnrollmentService.getFormData(tenantSlug);
    if (!formData) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .select("id, name, start_date, end_date, location, description, status")
      .eq("tenant_id", formData.tenantId)
      .eq("status", "published")
      .order("start_date", { ascending: true })
      .limit(Math.max(1, Math.min(limit, 200)));

    if (error) {
      throw new Error(`Failed to load public events: ${error.message}`);
    }

    return {
      tenantId: formData.tenantId,
      tenantName: formData.tenantName,
      events: (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        startDate: item.start_date,
        endDate: item.end_date,
        location: item.location,
        description: item.description,
        status: "published",
      })),
    };
  },

  async exportSchoolCalendarIcs(tenantSlug: string): Promise<{ filename: string; content: string } | null> {
    const formData = await publicEnrollmentService.getFormData(tenantSlug);
    if (!formData) {
      return null;
    }

    const eventsData = await this.listPublishedEvents(tenantSlug, 100);
    const icsEvents: IcalEvent[] = [];

    for (const schoolEvent of eventsData?.events || []) {
      const start = new Date(`${schoolEvent.startDate}T09:00:00`);
      const end = schoolEvent.endDate ? new Date(`${schoolEvent.endDate}T18:00:00`) : new Date(`${schoolEvent.startDate}T18:00:00`);
      icsEvents.push({
        uid: `event-${schoolEvent.id}@dance-school-hub`,
        summary: schoolEvent.name,
        description: schoolEvent.description || undefined,
        location: schoolEvent.location,
        start,
        end,
        allDay: true,
      });
    }

    for (const klass of formData.availableClasses) {
      for (const schedule of klass.schedules || []) {
        const dayKey = schedule.day.trim().toLowerCase();
        const byDay = WEEKDAY_BY_SPANISH_DAY[dayKey];
        if (!byDay) {
          continue;
        }

        const start = parseHourToDate(schedule.startHour);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + Math.max(30, schedule.duration));

        icsEvents.push({
          uid: `class-${klass.id}-${schedule.id}@dance-school-hub`,
          summary: `${klass.name} (${klass.discipline})`,
          description: `Clase regular${schedule.branchName ? ` - ${schedule.branchName}` : ""}`,
          location: schedule.room,
          start,
          end,
          rrule: `FREQ=WEEKLY;BYDAY=${byDay}`,
        });
      }
    }

    const safeSlug = tenantSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    return {
      filename: `${safeSlug}-calendar.ics`,
      content: buildIcalCalendar(`${formData.tenantName} - Calendario`, icsEvents),
    };
  },
};
