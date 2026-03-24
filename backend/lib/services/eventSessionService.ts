import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { CreateSessionInput, UpdateSessionInput, ReorderSessionsInput } from "@/lib/validators/eventSessionSchemas";

export interface EventSessionDB {
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

// Frontend type mapped
interface FrontendEventSession {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  name?: string;
  notes?: string;
}

async function mapSessionFromDB(session: EventSessionDB): Promise<FrontendEventSession> {
  return {
    id: session.id,
    date: session.date,
    startTime: session.start_time,
    ...(session.end_time && { endTime: session.end_time }),
    ...(session.name && { name: session.name }),
    ...(session.notes && { notes: session.notes }),
  };
}

export const eventSessionService = {
  async listSessionsByEvent(tenantId: string, eventId: string): Promise<FrontendEventSession[]> {
    // Verify event belongs to tenant
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found or unauthorized");
    }

    // Fetch sessions
    const { data: sessions, error } = await supabaseAdmin
      .from("event_sessions")
      .select("*")
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    const mapped: FrontendEventSession[] = [];
    for (const session of sessions || []) {
      try {
        const mapped_session = await mapSessionFromDB(session);
        mapped.push(mapped_session);
      } catch (err) {
        console.error(`Failed to map session ${session.id}:`, err);
      }
    }

    return mapped;
  },

  async getSession(tenantId: string, eventId: string, sessionId: string): Promise<FrontendEventSession | null> {
    // Verify event belongs to tenant
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found or unauthorized");
    }

    // Fetch session
    const { data: session, error } = await supabaseAdmin
      .from("event_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch session: ${error.message}`);
    }

    if (!session) {
      return null;
    }

    return mapSessionFromDB(session);
  },

  async createSession(
    tenantId: string,
    eventId: string,
    data: CreateSessionInput
  ): Promise<FrontendEventSession> {
    // Verify event belongs to tenant
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found or unauthorized");
    }

    // Get max position
    const { data: sessions } = await supabaseAdmin
      .from("event_sessions")
      .select("position")
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = (sessions && sessions.length > 0 ? sessions[0].position : -1) + 1;

    // Create session
    const { data: session, error } = await supabaseAdmin
      .from("event_sessions")
      .insert({
        event_id: eventId,
        tenant_id: tenantId,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        name: data.name,
        notes: data.notes,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return mapSessionFromDB(session);
  },

  async updateSession(
    tenantId: string,
    eventId: string,
    sessionId: string,
    data: UpdateSessionInput
  ): Promise<FrontendEventSession> {
    // Verify event and session belong to tenant
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("event_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (sessionError || !session) {
      throw new Error("Session not found or unauthorized");
    }

    // Update session
    const { data: updated, error } = await supabaseAdmin
      .from("event_sessions")
      .update({
        ...(data.date && { date: data.date }),
        ...(data.start_time && { start_time: data.start_time }),
        ...(data.end_time !== undefined && { end_time: data.end_time }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.notes !== undefined && { notes: data.notes }),
      })
      .eq("id", sessionId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return mapSessionFromDB(updated);
  },

  async deleteSession(tenantId: string, eventId: string, sessionId: string): Promise<void> {
    // Verify session belongs to event and tenant
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("event_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (sessionError || !session) {
      throw new Error("Session not found or unauthorized");
    }

    // Delete session (cascade will handle schedule items)
    const { error } = await supabaseAdmin
      .from("event_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  },

  async reorderSessions(
    tenantId: string,
    eventId: string,
    input: ReorderSessionsInput
  ): Promise<void> {
    // Verify event belongs to tenant
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found or unauthorized");
    }

    // Verify all sessions belong to the event
    const sessionIds = input.positions.map((p) => p.id);
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("event_sessions")
      .select("id")
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId)
      .in("id", sessionIds);

    if (sessionsError) {
      throw new Error(`Failed to verify sessions: ${sessionsError.message}`);
    }

    if (!sessions || sessions.length !== sessionIds.length) {
      throw new Error("Some sessions not found or unauthorized");
    }

    // Use transaction-like approach (Supabase doesn't have explicit transactions, so we batch)
    const updates = input.positions.map((p) =>
      supabaseAdmin
        .from("event_sessions")
        .update({ position: p.position })
        .eq("id", p.id)
        .eq("tenant_id", tenantId)
    );

    const results = await Promise.all(updates);

    for (const result of results) {
      if (result.error) {
        throw new Error(`Failed to reorder sessions: ${result.error.message}`);
      }
    }
  },
};
