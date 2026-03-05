import { Clock, User, MapPin, DollarSign, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassCardProps {
  name: string;
  teacher: string;
  time: string;
  room: string;
  price: number;
  spotsLeft: number;
  totalSpots: number;
  day: string;
  selected?: boolean;
  onSelect?: () => void;
}

export function ClassCard({
  name,
  teacher,
  time,
  room,
  price,
  spotsLeft,
  totalSpots,
  selected,
  onSelect,
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
        full && "opacity-50 cursor-not-allowed hover:shadow-soft hover:border-border"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground">{name}</h4>
        <span className="text-sm font-semibold text-primary">${price}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{teacher}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{time}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{room}</span>
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
            {full ? "Full" : `${spotsLeft}/${totalSpots} spots`}
          </span>
        </div>
        {selected && (
          <span className="text-xs font-medium text-primary animate-fade-in">
            Selected ✓
          </span>
        )}
      </div>
    </button>
  );
}
