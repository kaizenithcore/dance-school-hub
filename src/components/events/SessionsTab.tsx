import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { SessionScheduleEditor } from "./SessionScheduleEditor";
import type { DanceEvent, EventSession } from "@/lib/types/events";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  event: DanceEvent;
  onAddSession: (s: Omit<EventSession, "id" | "schedule">) => void;
  onUpdateSession: (sessionId: string, data: Partial<EventSession>) => void;
  onDeleteSession: (sessionId: string) => void;
  updateEvent: (id: string, data: Partial<DanceEvent>) => void;
}

export function SessionsTab({ event, onAddSession, onUpdateSession, onDeleteSession, updateEvent }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [newDate, setNewDate] = useState(event.startDate);
  const [newTime, setNewTime] = useState("10:00");
  const [newName, setNewName] = useState("");
  const [expandedSession, setExpandedSession] = useState<string | null>(event.sessions[0]?.id || null);

  const handleAdd = () => {
    onAddSession({ date: newDate, startTime: newTime, name: newName.trim() || undefined });
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
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
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
                    updateEvent={updateEvent}
                  />
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nueva sesión</DialogTitle></DialogHeader>
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
            <Button onClick={handleAdd} disabled={!newDate || !newTime}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
