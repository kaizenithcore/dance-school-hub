import type { KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar, MapPin, Users, MoreHorizontal, Eye, Pencil, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import type { DanceEvent } from "@/lib/types/events";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  events: DanceEvent[];
  onCreateNew: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function EventsListView({ events, onCreateNew, onView, onEdit, onDuplicate, onDelete }: Props) {
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, eventId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onView(eventId);
    }
  };

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Sin eventos todavía"
        description="Crea tu primer evento para empezar a organizar festivales y exhibiciones."
        actionLabel="Crear evento"
        onAction={onCreateNew}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-1" /> Crear evento
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((evt, i) => (
          <motion.div
            key={evt.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => onView(evt.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => handleCardKeyDown(event, evt.id)}
              aria-label={`Abrir detalle del evento ${evt.name}`}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">{evt.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Acciones del evento ${evt.name}`}
                        className="h-8 w-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(evt.id); }}>
                        <Eye className="h-4 w-4 mr-2" /> Ver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(evt.id); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(evt.id); }}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(evt.id); }}>
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={evt.status === "published" ? "default" : "secondary"}>
                    {evt.status === "published" ? "Publicado" : "Borrador"}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" /> {evt.sessions.length} {evt.sessions.length === 1 ? "sesión" : "sesiones"}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(evt.startDate), "d MMM yyyy", { locale: es })}
                    {evt.endDate && evt.endDate !== evt.startDate && ` – ${format(new Date(evt.endDate), "d MMM yyyy", { locale: es })}`}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {evt.location}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
