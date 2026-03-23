import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EventsListView } from "@/components/events/EventsListView";
import { EventFormModal } from "@/components/events/EventFormModal";
import { EventDetailView } from "@/components/events/EventDetailView";
import { useEvents, useEvent } from "@/hooks/useEvents";
import type { DanceEvent } from "@/lib/types/events";

type View = { mode: "list" } | { mode: "detail"; eventId: string } | { mode: "create" } | { mode: "edit"; eventId: string };

export default function EventsPage() {
  const { events, createEvent, updateEvent, deleteEvent, duplicateEvent } = useEvents();
  const [view, setView] = useState<View>({ mode: "list" });

  const activeEventId = view.mode === "detail" || view.mode === "edit" ? view.eventId : undefined;
  const { event, addSession, updateSession, deleteSession } = useEvent(activeEventId, events, updateEvent);

  const handleCreate = (data: Omit<DanceEvent, "id" | "createdAt" | "sessions">) => {
    const created = createEvent(data);
    setView({ mode: "detail", eventId: created.id });
  };

  const handleUpdate = (data: Omit<DanceEvent, "id" | "createdAt" | "sessions">) => {
    if (activeEventId) {
      updateEvent(activeEventId, data);
      setView({ mode: "detail", eventId: activeEventId });
    }
  };

  if (view.mode === "detail" && event) {
    return (
      <EventDetailView
        event={event}
        onBack={() => setView({ mode: "list" })}
        onEdit={() => setView({ mode: "edit", eventId: event.id })}
        onAddSession={addSession}
        onUpdateSession={updateSession}
        onDeleteSession={deleteSession}
        updateEvent={updateEvent}
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
        onDuplicate={duplicateEvent}
        onDelete={deleteEvent}
      />

      <EventFormModal
        open={view.mode === "create" || view.mode === "edit"}
        onOpenChange={(open) => { if (!open) setView({ mode: "list" }); }}
        event={view.mode === "edit" ? events.find((e) => e.id === view.eventId) : undefined}
        onSubmit={view.mode === "edit" ? handleUpdate : handleCreate}
      />
    </PageContainer>
  );
}
