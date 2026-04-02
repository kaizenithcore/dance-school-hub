import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { DanceEvent, EventSession, ScheduleItem } from "@/lib/types/events";
import {
  createEvent as createEventRequest,
  createScheduleItem as createScheduleItemRequest,
  createSession as createSessionRequest,
  deleteEvent as deleteEventRequest,
  deleteScheduleItem as deleteScheduleItemRequest,
  deleteSession as deleteSessionRequest,
  getEvent,
  getEvents,
  getScheduleItems,
  recalcScheduleTimes,
  reorderScheduleItems,
  updateEvent as updateEventRequest,
  updateScheduleItem as updateScheduleItemRequest,
  updateSession as updateSessionRequest,
  type EventInput,
  type ScheduleItemInput,
  type SessionInput,
} from "@/lib/api/events";

const EVENTS_CACHE_KEY = "nexa:events:cache";

function readEventsCache(): DanceEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(EVENTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DanceEvent[]) : [];
  } catch {
    return [];
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useEvents() {
  const [events, setEvents] = useState<DanceEvent[]>(() => readEventsCache());
  const [isLoading, setIsLoading] = useState(() => readEventsCache().length === 0);
  const [error, setError] = useState<string | null>(null);
  const hasBootCacheRef = useRef(readEventsCache().length > 0);

  const refreshEvents = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getEvents();
      setEvents(data);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los eventos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEvents({ silent: hasBootCacheRef.current });
  }, [refreshEvents]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(events));
  }, [events]);

  const upsertEvent = useCallback((event: DanceEvent) => {
    setEvents((prev) => {
      const exists = prev.some((item) => item.id === event.id);
      if (!exists) {
        return [event, ...prev];
      }
      return prev.map((item) => (item.id === event.id ? event : item));
    });
  }, []);

  const replaceEventFromServer = useCallback(async (eventId: string) => {
    const event = await getEvent(eventId);
    if (event) {
      upsertEvent(event);
    }
    return event;
  }, [upsertEvent]);

  const createEvent = useCallback(async (data: Omit<DanceEvent, "id" | "createdAt" | "sessions">) => {
    const created = await createEventRequest(data as EventInput);
    if (!created) {
      throw new Error("No se pudo crear el evento");
    }

    upsertEvent(created);
    return created;
  }, [upsertEvent]);

  const updateEvent = useCallback(async (id: string, data: Partial<DanceEvent>) => {
    const updated = await updateEventRequest(id, data as Partial<EventInput>);
    if (!updated) {
      throw new Error("No se pudo actualizar el evento");
    }

    upsertEvent(updated);
    return updated;
  }, [upsertEvent]);

  const deleteEvent = useCallback(async (id: string) => {
    await deleteEventRequest(id);
    setEvents((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addSession = useCallback(async (eventId: string, session: Omit<EventSession, "id" | "schedule">) => {
    const created = await createSessionRequest(eventId, session as SessionInput);
    if (!created) {
      throw new Error("No se pudo crear la sesión");
    }

    setEvents((prev) => prev.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return {
        ...event,
        sessions: [...event.sessions, created],
      };
    }));

    return created;
  }, []);

  const updateSession = useCallback(async (
    eventId: string,
    sessionId: string,
    data: Partial<EventSession>
  ) => {
    const updated = await updateSessionRequest(eventId, sessionId, data as Partial<SessionInput>);
    if (!updated) {
      throw new Error("No se pudo actualizar la sesión");
    }

    setEvents((prev) => prev.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return {
        ...event,
        sessions: event.sessions.map((session) =>
          session.id === sessionId ? { ...session, ...updated, schedule: session.schedule } : session
        ),
      };
    }));

    return updated;
  }, []);

  const deleteSession = useCallback(async (eventId: string, sessionId: string) => {
    await deleteSessionRequest(eventId, sessionId);

    setEvents((prev) => prev.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return {
        ...event,
        sessions: event.sessions.filter((session) => session.id !== sessionId),
      };
    }));
  }, []);

  const createScheduleItem = useCallback(async (
    eventId: string,
    sessionId: string,
    data: ScheduleItemInput
  ) => {
    const created = await createScheduleItemRequest(eventId, sessionId, data);
    if (!created) {
      throw new Error("No se pudo crear el bloque");
    }

    setEvents((prev) => prev.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return {
        ...event,
        sessions: event.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, schedule: [...session.schedule, created] }
            : session
        ),
      };
    }));

    return created;
  }, []);

  const updateScheduleItem = useCallback(async (
    eventId: string,
    sessionId: string,
    itemId: string,
    data: Partial<ScheduleItemInput>
  ) => {
    const updated = await updateScheduleItemRequest(eventId, sessionId, itemId, data);
    if (!updated) {
      throw new Error("No se pudo actualizar el bloque");
    }

    setEvents((prev) => prev.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return {
        ...event,
        sessions: event.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                schedule: session.schedule.map((item) => (item.id === itemId ? { ...item, ...updated } : item)),
              }
            : session
        ),
      };
    }));

    return updated;
  }, []);

  const deleteScheduleItem = useCallback(async (eventId: string, sessionId: string, itemId: string) => {
    await deleteScheduleItemRequest(eventId, sessionId, itemId);

    setEvents((prev) => prev.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return {
        ...event,
        sessions: event.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, schedule: session.schedule.filter((item) => item.id !== itemId) }
            : session
        ),
      };
    }));
  }, []);

  const moveScheduleItem = useCallback(async (
    eventId: string,
    sessionId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    let nextOrder: ScheduleItem[] = [];

    setEvents((prev) => prev.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return {
        ...event,
        sessions: event.sessions.map((session) => {
          if (session.id !== sessionId) {
            return session;
          }

          const copied = [...session.schedule];
          const [moved] = copied.splice(fromIndex, 1);
          copied.splice(toIndex, 0, moved);
          nextOrder = copied;

          return {
            ...session,
            schedule: copied,
          };
        }),
      };
    }));

    await reorderScheduleItems(
      eventId,
      sessionId,
      nextOrder.map((item, index) => ({ id: item.id, position: index }))
    );
  }, []);

  const recalculateSchedule = useCallback(async (eventId: string, sessionId: string) => {
    await recalcScheduleTimes(eventId, sessionId);
    const schedule = await getScheduleItems(eventId, sessionId);

    setEvents((prev) => prev.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      return {
        ...event,
        sessions: event.sessions.map((session) =>
          session.id === sessionId ? { ...session, schedule } : session
        ),
      };
    }));
  }, []);

  const duplicateEvent = useCallback(async (id: string) => {
    const original = events.find((item) => item.id === id);
    if (!original) {
      return null;
    }

    const duplicated = await createEventRequest({
      ...original,
      name: `${original.name} (copia)`,
      status: "draft",
    } as EventInput);

    if (!duplicated) {
      throw new Error("No se pudo duplicar el evento");
    }

    for (const session of original.sessions) {
      const createdSession = await createSessionRequest(duplicated.id, {
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        name: session.name,
        notes: session.notes,
      });

      if (!createdSession) {
        continue;
      }

      for (const block of session.schedule) {
        await createScheduleItemRequest(duplicated.id, createdSession.id, {
          time: block.time,
          duration: block.duration,
          groupName: block.groupName,
          choreography: block.choreography,
          participantsCount: block.participantsCount,
          notes: block.notes,
        });
      }
    }

    return replaceEventFromServer(duplicated.id);
  }, [events, replaceEventFromServer]);

  return {
    events,
    isLoading,
    error,
    refreshEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    addSession,
    updateSession,
    deleteSession,
    createScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    moveScheduleItem,
    recalculateSchedule,
  };
}

interface EventActions {
  addSession: (eventId: string, data: Omit<EventSession, "id" | "schedule">) => Promise<EventSession>;
  updateSession: (eventId: string, sessionId: string, data: Partial<EventSession>) => Promise<EventSession>;
  deleteSession: (eventId: string, sessionId: string) => Promise<void>;
}

export function useEvent(id: string | undefined, allEvents: DanceEvent[], actions: EventActions) {
  const event = useMemo(() => allEvents.find((e) => e.id === id), [allEvents, id]);

  const addSession = useCallback(async (session: Omit<EventSession, "id" | "schedule">) => {
    if (!event) return;
    return actions.addSession(event.id, session);
  }, [actions, event]);

  const updateSession = useCallback(async (sessionId: string, data: Partial<EventSession>) => {
    if (!event) return;
    return actions.updateSession(event.id, sessionId, data);
  }, [actions, event]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!event) return;
    return actions.deleteSession(event.id, sessionId);
  }, [actions, event]);

  return { event, addSession, updateSession, deleteSession };
}

interface ScheduleActions {
  createScheduleItem: (eventId: string, sessionId: string, data: ScheduleItemInput) => Promise<ScheduleItem>;
  updateScheduleItem: (
    eventId: string,
    sessionId: string,
    itemId: string,
    data: Partial<ScheduleItemInput>
  ) => Promise<ScheduleItem>;
  deleteScheduleItem: (eventId: string, sessionId: string, itemId: string) => Promise<void>;
  moveScheduleItem: (eventId: string, sessionId: string, fromIndex: number, toIndex: number) => Promise<void>;
  recalculateSchedule: (eventId: string, sessionId: string) => Promise<void>;
}

export function useSessionSchedule(
  event: DanceEvent | undefined,
  sessionId: string | undefined,
  actions: ScheduleActions
) {
  const session = useMemo(() => event?.sessions.find((s) => s.id === sessionId), [event, sessionId]);
  const schedule = session?.schedule || [];
  const updateTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(updateTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const addBlock = useCallback(async () => {
    if (!event || !sessionId) return;

    const lastItem = schedule[schedule.length - 1];
    let nextTime = session?.startTime || "10:00";
    if (lastItem) {
      const [h, m] = lastItem.time.split(":").map(Number);
      const total = h * 60 + m + lastItem.duration;
      nextTime = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }

    await actions.createScheduleItem(event.id, sessionId, {
      time: nextTime,
      duration: 5,
      groupName: "",
    });
  }, [actions, event, schedule, session, sessionId]);

  const updateBlock = useCallback((blockId: string, data: Partial<ScheduleItem>) => {
    if (!event || !sessionId) return;

    if (updateTimersRef.current[blockId]) {
      clearTimeout(updateTimersRef.current[blockId]);
    }

    updateTimersRef.current[blockId] = setTimeout(() => {
      void actions.updateScheduleItem(event.id, sessionId, blockId, {
        time: data.time,
        duration: data.duration,
        groupName: data.groupName,
        choreography: data.choreography,
        participantsCount: data.participantsCount,
        notes: data.notes,
      });
    }, 350);
  }, [actions, event, sessionId]);

  const removeBlock = useCallback(async (blockId: string) => {
    if (!event || !sessionId) return;
    await actions.deleteScheduleItem(event.id, sessionId, blockId);
  }, [actions, event, sessionId]);

  const duplicateBlock = useCallback(async (blockId: string) => {
    if (!event || !sessionId) return;

    const idx = schedule.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const source = schedule[idx];

    await actions.createScheduleItem(event.id, sessionId, {
      time: source.time,
      duration: source.duration,
      groupName: source.groupName,
      choreography: source.choreography,
      participantsCount: source.participantsCount,
      notes: source.notes,
    });
  }, [actions, event, schedule, sessionId]);

  const moveBlock = useCallback(async (fromIdx: number, toIdx: number) => {
    if (!event || !sessionId) return;
    await actions.moveScheduleItem(event.id, sessionId, fromIdx, toIdx);
  }, [actions, event, sessionId]);

  const recalcTimes = useCallback(async () => {
    if (!event || !sessionId) return;
    await actions.recalculateSchedule(event.id, sessionId);
  }, [actions, event, sessionId]);

  const totalDuration = useMemo(() => schedule.reduce((sum, b) => sum + b.duration, 0), [schedule]);

  return { session, schedule, addBlock, updateBlock, removeBlock, duplicateBlock, moveBlock, recalcTimes, totalDuration };
}
