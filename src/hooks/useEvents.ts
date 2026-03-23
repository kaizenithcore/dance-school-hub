import { useState, useCallback, useMemo } from "react";
import { mockEvents } from "@/lib/data/mockEvents";
import type { DanceEvent, EventSession, ScheduleItem } from "@/lib/types/events";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useEvents() {
  const [events, setEvents] = useState<DanceEvent[]>(mockEvents);

  const createEvent = useCallback((data: Omit<DanceEvent, "id" | "createdAt" | "sessions">) => {
    const newEvent: DanceEvent = { ...data, id: uid(), createdAt: new Date().toISOString(), sessions: [] };
    setEvents((prev) => [newEvent, ...prev]);
    return newEvent;
  }, []);

  const updateEvent = useCallback((id: string, data: Partial<DanceEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const duplicateEvent = useCallback((id: string) => {
    setEvents((prev) => {
      const original = prev.find((e) => e.id === id);
      if (!original) return prev;
      const copy: DanceEvent = {
        ...original,
        id: uid(),
        name: `${original.name} (copia)`,
        status: "draft",
        createdAt: new Date().toISOString(),
        sessions: original.sessions.map((s) => ({
          ...s,
          id: uid(),
          schedule: s.schedule.map((si) => ({ ...si, id: uid() })),
        })),
      };
      return [copy, ...prev];
    });
  }, []);

  return { events, createEvent, updateEvent, deleteEvent, duplicateEvent };
}

export function useEvent(id: string | undefined, allEvents: DanceEvent[], updateEvent: (id: string, data: Partial<DanceEvent>) => void) {
  const event = useMemo(() => allEvents.find((e) => e.id === id), [allEvents, id]);

  const addSession = useCallback((session: Omit<EventSession, "id" | "schedule">) => {
    if (!event) return;
    const newSession: EventSession = { ...session, id: uid(), schedule: [] };
    updateEvent(event.id, { sessions: [...event.sessions, newSession] });
  }, [event, updateEvent]);

  const updateSession = useCallback((sessionId: string, data: Partial<EventSession>) => {
    if (!event) return;
    updateEvent(event.id, {
      sessions: event.sessions.map((s) => (s.id === sessionId ? { ...s, ...data } : s)),
    });
  }, [event, updateEvent]);

  const deleteSession = useCallback((sessionId: string) => {
    if (!event) return;
    updateEvent(event.id, { sessions: event.sessions.filter((s) => s.id !== sessionId) });
  }, [event, updateEvent]);

  return { event, addSession, updateSession, deleteSession };
}

export function useSessionSchedule(
  event: DanceEvent | undefined,
  sessionId: string | undefined,
  updateEvent: (id: string, data: Partial<DanceEvent>) => void
) {
  const session = useMemo(() => event?.sessions.find((s) => s.id === sessionId), [event, sessionId]);
  const schedule = session?.schedule || [];

  const updateSchedule = useCallback((newSchedule: ScheduleItem[]) => {
    if (!event || !sessionId) return;
    updateEvent(event.id, {
      sessions: event.sessions.map((s) => (s.id === sessionId ? { ...s, schedule: newSchedule } : s)),
    });
  }, [event, sessionId, updateEvent]);

  const addBlock = useCallback(() => {
    const lastItem = schedule[schedule.length - 1];
    let nextTime = session?.startTime || "10:00";
    if (lastItem) {
      const [h, m] = lastItem.time.split(":").map(Number);
      const total = h * 60 + m + lastItem.duration;
      nextTime = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }
    const item: ScheduleItem = { id: uid(), time: nextTime, duration: 5, groupName: "" };
    updateSchedule([...schedule, item]);
  }, [schedule, session, updateSchedule]);

  const updateBlock = useCallback((blockId: string, data: Partial<ScheduleItem>) => {
    updateSchedule(schedule.map((b) => (b.id === blockId ? { ...b, ...data } : b)));
  }, [schedule, updateSchedule]);

  const removeBlock = useCallback((blockId: string) => {
    updateSchedule(schedule.filter((b) => b.id !== blockId));
  }, [schedule, updateSchedule]);

  const duplicateBlock = useCallback((blockId: string) => {
    const idx = schedule.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const copy = { ...schedule[idx], id: uid() };
    const next = [...schedule];
    next.splice(idx + 1, 0, copy);
    updateSchedule(next);
  }, [schedule, updateSchedule]);

  const moveBlock = useCallback((fromIdx: number, toIdx: number) => {
    const next = [...schedule];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updateSchedule(next);
  }, [schedule, updateSchedule]);

  const recalcTimes = useCallback(() => {
    if (!session) return;
    let cursor = session.startTime || "10:00";
    const updated = schedule.map((item) => {
      const newItem = { ...item, time: cursor };
      const [h, m] = cursor.split(":").map(Number);
      const total = h * 60 + m + item.duration;
      cursor = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
      return newItem;
    });
    updateSchedule(updated);
  }, [schedule, session, updateSchedule]);

  const totalDuration = useMemo(() => schedule.reduce((sum, b) => sum + b.duration, 0), [schedule]);

  return { session, schedule, addBlock, updateBlock, removeBlock, duplicateBlock, moveBlock, recalcTimes, totalDuration };
}
