import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { DanceEvent, EventStatus } from "@/lib/types/events";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: DanceEvent;
  onSubmit: (data: Omit<DanceEvent, "id" | "createdAt" | "sessions">) => void;
}

export function EventFormModal({ open, onOpenChange, event, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<EventStatus>("draft");
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (event) {
      setName(event.name);
      setStartDate(event.startDate);
      setEndDate(event.endDate || "");
      setLocation(event.location);
      setDescription(event.description || "");
      setTicketPrice(event.ticketPrice?.toString() || "");
      setCapacity(event.capacity?.toString() || "");
      setNotes(event.notes || "");
      setStatus(event.status);
    } else {
      setName(""); setStartDate(""); setEndDate(""); setLocation("");
      setDescription(""); setTicketPrice(""); setCapacity(""); setNotes("");
      setStatus("draft"); setShowOptional(false);
    }
  }, [event, open]);

  const canSubmit = name.trim() && startDate && location.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      startDate,
      endDate: endDate || undefined,
      location: location.trim(),
      description: description.trim() || undefined,
      ticketPrice: ticketPrice ? Number(ticketPrice) : undefined,
      capacity: capacity ? Number(capacity) : undefined,
      notes: notes.trim() || undefined,
      status,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Crear evento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="evt-name">Nombre del evento *</Label>
            <Input id="evt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Festival de Primavera" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="evt-start">Fecha inicio *</Label>
              <Input id="evt-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evt-end">Fecha fin</Label>
              <Input id="evt-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evt-location">Ubicación *</Label>
            <Input id="evt-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Teatro Municipal" />
          </div>

          <Collapsible open={showOptional} onOpenChange={setShowOptional}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <ChevronDown className={`h-4 w-4 transition-transform ${showOptional ? "rotate-180" : ""}`} />
                Campos opcionales
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="evt-desc">Descripción</Label>
                <Textarea id="evt-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="evt-price">Precio entrada (€)</Label>
                  <Input id="evt-price" type="number" min={0} value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evt-cap">Aforo</Label>
                  <Input id="evt-cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="evt-notes">Notas</Label>
                <Textarea id="evt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>{event ? "Guardar" : "Crear evento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
