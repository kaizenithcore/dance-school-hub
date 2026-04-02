import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { SessionScheduleEditor } from "./SessionScheduleEditor";
import type { DanceEvent, EventSession, ScheduleItem } from "@/lib/types/events";
import type { ScheduleItemInput } from "@/lib/api/events";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  event: DanceEvent;
  onAddSession: (s: Omit<EventSession, "id" | "schedule">) => Promise<EventSession | undefined>;
  onUpdateSession: (sessionId: string, data: Partial<EventSession>) => Promise<EventSession | undefined>;
  onDeleteSession: (sessionId: string) => Promise<void | undefined>;
  scheduleActions: {
    createScheduleItem: (eventId: string, sessionId: string, data: ScheduleItemInput) => Promise<ScheduleItem>;
    updateScheduleItem: (eventId: string, sessionId: string, itemId: string, data: Partial<ScheduleItemInput>) => Promise<ScheduleItem>;
    deleteScheduleItem: (eventId: string, sessionId: string, itemId: string) => Promise<void>;
    moveScheduleItem: (eventId: string, sessionId: string, fromIndex: number, toIndex: number) => Promise<void>;
    recalculateSchedule: (eventId: string, sessionId: string) => Promise<void>;
  };
}

export function SessionsTab({ event, onAddSession, onUpdateSession, onDeleteSession, scheduleActions }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [newDate, setNewDate] = useState(event.startDate);
  const [newTime, setNewTime] = useState("10:00");
  const [newName, setNewName] = useState("");
  const [expandedSession, setExpandedSession] = useState<string | null>(event.sessions[0]?.id || null);

  const handleAdd = async () => {
    await onAddSession({ date: newDate, startTime: newTime, name: newName.trim() || undefined });
    setAddOpen(false);
    setNewName("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Añadir sesión
        </Button>
      </div>

      {event.sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay sesiones todavía. Añade una para empezar a crear la escaleta.</p>
          </CardContent>
        </Card>
      ) : (
        event.sessions.map((session) => {
          const isExpanded = expandedSession === session.id;
          return (
            <Card key={session.id}>
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <CardTitle className="text-base">
                        {session.name || format(new Date(session.date), "EEEE d MMM", { locale: es })}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(session.date), "d MMM yyyy", { locale: es })} · {session.startTime}
                        {session.endTime && ` – ${session.endTime}`}
                        {" · "}{session.schedule.length} actuaciones
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar sesión ${session.name || format(new Date(session.date), "d MMM yyyy", { locale: es })}`}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); void onDeleteSession(session.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <SessionScheduleEditor
                    event={event}
                    sessionId={session.id}
                    scheduleActions={scheduleActions}
                  />
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva sesión</DialogTitle>
            <DialogDescription>
              Define fecha y hora para crear una nueva sesión dentro de este evento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora de inicio *</Label>
              <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nombre (opcional)</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Gala de tarde" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => { void handleAdd(); }} disabled={!newDate || !newTime}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
