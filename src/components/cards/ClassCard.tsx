import { Clock, User, MapPin, Users, Repeat, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClassCardData {
  id: string;
  name: string;
  teacher: string;
  time: string;
  room: string;
  price: number;
  spotsLeft: number;
  totalSpots: number;
  day: string;
  recurrence: "weekly" | "once";
  date?: string; // for punctual classes
}

interface ClassCardProps extends ClassCardData {
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}

export function ClassCard({
  name,
  teacher,
  time,
  room,
  price,
  spotsLeft,
  totalSpots,
  recurrence,
  date,
  selected,
  onSelect,
  compact,
}: ClassCardProps) {
  const almostFull = spotsLeft <= 3 && spotsLeft > 0;
  const full = spotsLeft === 0;

  return (
    <button
      onClick={onSelect}
      disabled={full}
      className={cn(
        "w-full text-left rounded-lg border p-4 transition-all duration-200",
        "hover:shadow-medium hover:border-primary/30",
        selected
          ? "border-primary bg-accent shadow-medium ring-1 ring-primary/20"
          : "border-border bg-card shadow-soft",
        full && "opacity-50 cursor-not-allowed hover:shadow-soft hover:border-border",
        compact && "p-3"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>{name}</h4>
        <span className={cn("font-semibold text-primary", compact ? "text-xs" : "text-sm")}>${price}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span>{teacher}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{time}</span>
        </div>
        {!compact && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{room}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {recurrence === "weekly" ? (
            <>
              <Repeat className="h-3 w-3 shrink-0" />
              <span>Semanal</span>
            </>
          ) : (
            <>
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span>{date || "Clase puntual"}</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span
            className={cn(
              "text-xs font-medium",
              full
                ? "text-destructive"
                : almostFull
                ? "text-warning"
                : "text-muted-foreground"
            )}
          >
            {full ? "Completo" : `${spotsLeft}/${totalSpots} lugares`}
          </span>
        </div>
        {selected && (
          <span className="text-xs font-medium text-primary animate-fade-in">
            Seleccionada ✓
          </span>
        )}
      </div>
    </button>
  );
}
