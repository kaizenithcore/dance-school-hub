import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { EventsListView } from "@/components/events/EventsListView";
import { EventFormModal } from "@/components/events/EventFormModal";
import { EventDetailView } from "@/components/events/EventDetailView";
import { useEvents, useEvent } from "@/hooks/useEvents";
import type { DanceEvent } from "@/lib/types/events";

type View = { mode: "list" } | { mode: "detail"; eventId: string } | { mode: "create" } | { mode: "edit"; eventId: string };

export default function EventsPage() {
  const {
    events,
    isLoading,
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
  } = useEvents();
  const [view, setView] = useState<View>({ mode: "list" });
  const [searchParams, setSearchParams] = useSearchParams();

  const activeEventId = view.mode === "detail" || view.mode === "edit" ? view.eventId : undefined;
  const { event, addSession: addEventSession, updateSession: updateEventSession, deleteSession: deleteEventSession } = useEvent(
    activeEventId,
    events,
    { addSession, updateSession, deleteSession }
  );

  const handleCreate = async (data: Omit<DanceEvent, "id" | "createdAt" | "sessions">) => {
    const created = await createEvent(data);
    if (created) {
      setView({ mode: "detail", eventId: created.id });
    }
  };

  const handleUpdate = async (data: Omit<DanceEvent, "id" | "createdAt" | "sessions">) => {
    if (activeEventId) {
      await updateEvent(activeEventId, data);
      setView({ mode: "detail", eventId: activeEventId });
    }
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const targetId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!targetId || !action) {
      return;
    }

    const targetEvent = events.find((event) => event.id === targetId);
    if (!targetEvent) {
      return;
    }

    if (action === "preview") {
      setView({ mode: "detail", eventId: targetEvent.id });
    } else if (action === "edit") {
      setView({ mode: "edit", eventId: targetEvent.id });
    }

    setSearchParams({}, { replace: true });
  }, [events, isLoading, searchParams, setSearchParams]);

  if (isLoading && view.mode === "list") {
    return (
      <PageContainer
        title="Eventos"
        description="Cargando eventos..."
      >
        <div className="text-sm text-muted-foreground">Cargando eventos...</div>
      </PageContainer>
    );
  }

  if (view.mode === "detail" && event) {
    return (
      <EventDetailView
        event={event}
        onBack={() => setView({ mode: "list" })}
        onEdit={() => setView({ mode: "edit", eventId: event.id })}
        onAddSession={addEventSession}
        onUpdateSession={updateEventSession}
        onDeleteSession={deleteEventSession}
        scheduleActions={{
          createScheduleItem,
          updateScheduleItem,
          deleteScheduleItem,
          moveScheduleItem,
          recalculateSchedule,
        }}
      />
    );
  }

  return (
    <PageContainer
      title="Eventos"
      description="Crea y gestiona festivales, exhibiciones y eventos de tu escuela"
    >
      <EventsListView
        events={events}
        onCreateNew={() => setView({ mode: "create" })}
        onView={(id) => setView({ mode: "detail", eventId: id })}
        onEdit={(id) => setView({ mode: "edit", eventId: id })}
        onDuplicate={(id) => { void duplicateEvent(id); }}
        onDelete={(id) => { void deleteEvent(id); }}
      />

      <EventFormModal
        open={view.mode === "create" || view.mode === "edit"}
        onOpenChange={(open) => { if (!open) setView({ mode: "list" }); }}
        event={view.mode === "edit" ? events.find((e) => e.id === view.eventId) : undefined}
        onSubmit={(data) => { void (view.mode === "edit" ? handleUpdate(data) : handleCreate(data)); }}
      />
    </PageContainer>
  );
}
