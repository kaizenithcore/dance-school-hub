import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { eventScheduleItemService, type FrontendScheduleItem } from "@/lib/services/eventScheduleItemService";
import { integrationWebhookService } from "@/lib/services/integrationWebhookService";
import type { CreateEventInput, UpdateEventInput } from "@/lib/validators/eventSchemas";

interface EventListPaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedEventsResult {
  items: FrontendDanceEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Event {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string;
  description: string | null;
  ticket_price_cents: number | null;
  capacity: number | null;
  notes: string | null;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
}

export interface EventSession {
  id: string;
  event_id: string;
  tenant_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  name: string | null;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface FrontendSession {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  name?: string;
  notes?: string;
  schedule: FrontendScheduleItem[];
}

export interface FrontendDanceEvent {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  location: string;
  description?: string;
  ticketPrice?: number;
  capacity?: number;
  notes?: string;
  status: "draft" | "published";
  sessions: FrontendSession[];
  createdAt: string;
}

export interface EventPublishValidationResult {
  valid: boolean;
  errors: string[];
}

async function writeAuditLog(
  tenantId: string,
  actorUserId: string | undefined,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin.from("audit_log").insert({
    tenant_id: tenantId,
    actor_user_id: actorUserId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error(`Failed to write audit log for ${action}: ${error.message}`);
  }
}

async function fetchMappedEvents(events: Event[]): Promise<FrontendDanceEvent[]> {
  const mappedEvents: FrontendDanceEvent[] = [];

  for (const event of events) {
    try {
      const mapped = await mapEventWithSessions(event);
      mappedEvents.push(mapped);
    } catch (err) {
      console.error(`Failed to map event ${event.id}:`, err);
    }
  }

  return mappedEvents;
}

async function mapEventWithSessions(event: Event): Promise<FrontendDanceEvent> {
  // Fetch sessions
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from("event_sessions")
    .select("*")
    .eq("event_id", event.id)
    .eq("tenant_id", event.tenant_id)
    .order("position", { ascending: true });

  if (sessionsError) {
    throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
  }

  // Map sessions with their schedule items
  const mappedSessions: FrontendSession[] = [];

  for (const session of sessions || []) {
    const mappedSchedule = await eventScheduleItemService.listScheduleItems(
      event.tenant_id,
      event.id,
      session.id
    );

    mappedSessions.push({
      id: session.id,
      date: session.date,
      startTime: session.start_time,
      ...(session.end_time && { endTime: session.end_time }),
      ...(session.name && { name: session.name }),
      ...(session.notes && { notes: session.notes }),
      schedule: mappedSchedule,
    });
  }

  return {
    id: event.id,
    name: event.name,
    startDate: event.start_date,
    ...(event.end_date && { endDate: event.end_date }),
    location: event.location,
    ...(event.description && { description: event.description }),
    ...(event.ticket_price_cents !== null && { ticketPrice: event.ticket_price_cents }),
    ...(event.capacity !== null && { capacity: event.capacity }),
    ...(event.notes && { notes: event.notes }),
    status: event.status,
    sessions: mappedSessions,
    createdAt: event.created_at,
  };
}

export const eventService = {
  async listEvents(tenantId: string): Promise<FrontendDanceEvent[]> {
    const { data: events, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return fetchMappedEvents((events ?? []) as Event[]);
  },

  async listEventsPaginated(
    tenantId: string,
    options: EventListPaginationOptions
  ): Promise<PaginatedEventsResult> {
    const safePage = Math.max(1, options.page);
    const safePageSize = Math.min(100, Math.max(1, options.pageSize));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    const { data: events, count, error } = await supabaseAdmin
      .from("events")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    const items = await fetchMappedEvents((events ?? []) as Event[]);
    const total = count ?? 0;

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / safePageSize),
    };
  },

  async getEvent(tenantId: string, eventId: string): Promise<FrontendDanceEvent | null> {
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch event: ${error.message}`);
    }

    if (!event) {
      return null;
    }

    return mapEventWithSessions(event);
  },

  async createEvent(
    tenantId: string,
    data: CreateEventInput,
    actorUserId?: string
  ): Promise<FrontendDanceEvent> {
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .insert({
        tenant_id: tenantId,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        location: data.location,
        description: data.description,
        ticket_price_cents: data.ticket_price_cents,
        capacity: data.capacity,
        notes: data.notes,
        status: data.status || "draft",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }

    await writeAuditLog(tenantId, actorUserId, "create_event", "event", event.id, {
      name: event.name,
      status: event.status,
      startDate: event.start_date,
      location: event.location,
    });

    return mapEventWithSessions(event as Event);
  },

  async updateEvent(
    tenantId: string,
    eventId: string,
    data: UpdateEventInput,
    actorUserId?: string
  ): Promise<FrontendDanceEvent> {
    // Verify event belongs to tenant before updating
    const existing = await this.getEvent(tenantId, eventId);
    if (!existing) {
      throw new Error("Event not found");
    }

    const wasPublished = existing.status === "published";

    const { data: event, error } = await supabaseAdmin
      .from("events")
      .update({
        ...(data.name && { name: data.name }),
        ...(data.start_date && { start_date: data.start_date }),
        ...(data.end_date !== undefined && { end_date: data.end_date }),
        ...(data.location && { location: data.location }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.ticket_price_cents !== undefined && { ticket_price_cents: data.ticket_price_cents }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status && { status: data.status }),
      })
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }

    await writeAuditLog(tenantId, actorUserId, "update_event", "event", eventId, {
      fields: Object.keys(data),
      status: event.status,
    });

    if (!wasPublished && event.status === "published") {
      void integrationWebhookService.emit({
        event: "event.published",
        tenantId,
        occurredAt: new Date().toISOString(),
        data: {
          eventId,
          name: event.name,
          startDate: event.start_date,
          location: event.location,
        },
      });
    }

    return mapEventWithSessions(event as Event);
  },

  async deleteEvent(tenantId: string, eventId: string, actorUserId?: string): Promise<void> {
    // Verify event exists before deleting
    const existing = await this.getEvent(tenantId, eventId);
    if (!existing) {
      throw new Error("Event not found");
    }

    const { error } = await supabaseAdmin.from("events").delete().eq("id", eventId).eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }

    await writeAuditLog(tenantId, actorUserId, "delete_event", "event", eventId, {
      name: existing.name,
      status: existing.status,
    });
  },

  async validatePublishEvent(tenantId: string, eventId: string): Promise<EventPublishValidationResult> {
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("event_sessions")
      .select("id, name, position")
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });

    if (sessionsError) {
      throw new Error(`Failed to validate event sessions: ${sessionsError.message}`);
    }

    const errors: string[] = [];

    if (!sessions || sessions.length === 0) {
      errors.push("El evento debe tener al menos una sesión antes de publicarse");
      return { valid: false, errors };
    }

    const sessionIds = sessions.map((session) => session.id);
    const { data: scheduleItems, error: itemsError } = await supabaseAdmin
      .from("event_schedule_items")
      .select("session_id")
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .in("session_id", sessionIds);

    if (itemsError) {
      throw new Error(`Failed to validate event schedule items: ${itemsError.message}`);
    }

    const scheduleCountBySession = new Map<string, number>();
    for (const item of scheduleItems ?? []) {
      scheduleCountBySession.set(item.session_id, (scheduleCountBySession.get(item.session_id) ?? 0) + 1);
    }

    for (const session of sessions) {
      if ((scheduleCountBySession.get(session.id) ?? 0) === 0) {
        errors.push(
          session.name
            ? `La sesión \"${session.name}\" debe tener al menos un bloque en la escaleta`
            : `La sesión ${session.position + 1} debe tener al menos un bloque en la escaleta`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  async publishEvent(
    tenantId: string,
    eventId: string,
    actorUserId?: string
  ): Promise<{ event: FrontendDanceEvent; errors: string[] }> {
    const validation = await this.validatePublishEvent(tenantId, eventId);
    if (!validation.valid) {
      return {
        event: (await this.getEvent(tenantId, eventId)) as FrontendDanceEvent,
        errors: validation.errors,
      };
    }

    const { error } = await supabaseAdmin
      .from("events")
      .update({ status: "published" })
      .eq("id", eventId)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Failed to publish event: ${error.message}`);
    }

    const event = await this.getEvent(tenantId, eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await writeAuditLog(tenantId, actorUserId, "publish_event", "event", eventId, {
      status: event.status,
    });

    return { event, errors: [] };
  },

  async unpublishEvent(
    tenantId: string,
    eventId: string,
    actorUserId?: string
  ): Promise<FrontendDanceEvent> {
    const { data: existingEvent, error: existingError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (existingError || !existingEvent) {
      throw new Error("Event not found");
    }

    const { error } = await supabaseAdmin
      .from("events")
      .update({ status: "draft" })
      .eq("id", eventId)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Failed to unpublish event: ${error.message}`);
    }

    const event = await this.getEvent(tenantId, eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await writeAuditLog(tenantId, actorUserId, "unpublish_event", "event", eventId, {
      status: event.status,
    });

    return event;
  },
};
