import { Clock, MapPin, User as UserIcon } from "lucide-react";
import type { PortalClass } from "../data/mockData";
import { cn } from "@/lib/utils";

interface Props {
  cls: PortalClass;
  compact?: boolean;
  onClick?: () => void;
}

export function PortalClassCard({ cls, compact, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md touch-manipulation active:scale-[0.99]",
        compact && "p-3"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-foreground">{cls.name}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{cls.time}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{cls.room}</span>
            <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{cls.teacher}</span>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
          {cls.day}
        </span>
      </div>
    </button>
  );
}
