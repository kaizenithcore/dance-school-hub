import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Calendar, MapPin, Users, Ticket, Info } from "lucide-react";
import { SessionsTab } from "./SessionsTab";
import { EventParticipantsTab } from "./EventParticipantsTab";
import type { DanceEvent, EventSession } from "@/lib/types/events";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  event: DanceEvent;
  onBack: () => void;
  onEdit: () => void;
  onAddSession: (s: Omit<EventSession, "id" | "schedule">) => void;
  onUpdateSession: (sessionId: string, data: Partial<EventSession>) => void;
  onDeleteSession: (sessionId: string) => void;
  updateEvent: (id: string, data: Partial<DanceEvent>) => void;
}

export function EventDetailView({ event, onBack, onEdit, onAddSession, onUpdateSession, onDeleteSession, updateEvent }: Props) {
  const [tab, setTab] = useState("overview");
  const totalBlocks = event.sessions.reduce((sum, s) => sum + s.schedule.length, 0);

  return (
    <PageContainer
      title={event.name}
      description={
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={event.status === "published" ? "default" : "secondary"}>
            {event.status === "published" ? "Publicado" : "Borrador"}
          </Badge>
          <span className="text-muted-foreground text-sm flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(event.startDate), "d MMM yyyy", { locale: es })}
          </span>
          <span className="text-muted-foreground text-sm flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {event.location}
          </span>
        </div>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1" /> Editar
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones y escaleta</TabsTrigger>
          <TabsTrigger value="participants">Participantes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Sesiones</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{event.sessions.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Actuaciones</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{totalBlocks}</p></CardContent>
            </Card>
            {event.capacity && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Aforo</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold flex items-center gap-1"><Users className="h-5 w-5 text-muted-foreground" />{event.capacity}</p></CardContent>
              </Card>
            )}
            {event.ticketPrice != null && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Entrada</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold flex items-center gap-1"><Ticket className="h-5 w-5 text-muted-foreground" />{event.ticketPrice}€</p></CardContent>
              </Card>
            )}
          </div>

          {event.description && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Info className="h-4 w-4" /> Descripción</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p></CardContent>
            </Card>
          )}

          {event.sessions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">Este evento aún no tiene sesiones.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setTab("sessions")}>Añadir sesión</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <SessionsTab
            event={event}
            onAddSession={onAddSession}
            onUpdateSession={onUpdateSession}
            onDeleteSession={onDeleteSession}
            updateEvent={updateEvent}
          />
        </TabsContent>

        <TabsContent value="participants" className="mt-4">
          <EventParticipantsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
