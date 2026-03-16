import { CalendarDays, MapPin, Users } from "lucide-react";
import type { PortalEvent } from "../data/mockData";
import { cn } from "@/lib/utils";

const typeLabel: Record<PortalEvent["type"], string> = {
  festival: "Festival",
  exhibition: "Exhibición",
  competition: "Competición",
  workshop: "Workshop",
};

const typeColor: Record<PortalEvent["type"], string> = {
  festival: "bg-primary/10 text-primary",
  exhibition: "bg-success/10 text-success",
  competition: "bg-warning/10 text-warning",
  workshop: "bg-info/10 text-info",
};

interface Props {
  event: PortalEvent;
  onClick?: () => void;
}

export function EventCard({ event, onClick }: Props) {
  const d = new Date(event.date);
  const month = d.toLocaleDateString("es-ES", { month: "short" }).toUpperCase();
  const day = d.getDate();

  return (
    <button onClick={onClick} className="w-full rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md">
      <div className="flex gap-3">
        {/* Date badge */}
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10">
          <span className="text-[10px] font-bold uppercase text-primary">{month}</span>
          <span className="text-xl font-bold text-primary">{day}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-semibold text-foreground">{event.name}</h4>
          </div>
          <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", typeColor[event.type])}>
            {typeLabel[event.type]}
          </span>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.participants} participantes</span>
          </div>
        </div>
      </div>
    </button>
  );
}
