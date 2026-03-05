import { useState } from "react";
import { cn } from "@/lib/utils";
import { ClassCard, ClassCardData } from "@/components/cards/ClassCard";
import { DAYS_ES, TIME_SLOTS } from "@/lib/data/mockClasses";
import { CalendarDays, List, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeeklyScheduleProps {
  classes: ClassCardData[];
  selectedClassIds: string[];
  onToggleClass: (id: string) => void;
}

type ViewMode = "calendar" | "list";
type FilterMode = "all" | "weekly" | "once";

function parseStartHour(time: string): number {
  const match = time.match(/^(\d{2}):(\d{2})/);
  return match ? parseInt(match[1]) : 0;
}

function parseDuration(time: string): number {
  const parts = time.split("–");
  if (parts.length !== 2) return 1;
  const start = parseStartHour(parts[0]);
  const endMatch = parts[1].match(/^(\d{2}):(\d{2})/);
  const end = endMatch ? parseInt(endMatch[1]) + (parseInt(endMatch[2]) > 0 ? 0.5 : 0) : start + 1;
  return Math.max(1, end - start);
}

export function WeeklySchedule({ classes, selectedClassIds, onToggleClass }: WeeklyScheduleProps) {
  const [view, setView] = useState<ViewMode>("calendar");
  const [filter, setFilter] = useState<FilterMode>("all");

  const filteredClasses = classes.filter((c) => {
    if (filter === "weekly") return c.recurrence === "weekly";
    if (filter === "once") return c.recurrence === "once";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "calendar" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendario
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
        </div>

        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          {(["all", "weekly", "once"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" && "Todas"}
              {f === "weekly" && (
                <>
                  <Repeat className="h-3 w-3" /> Semanales
                </>
              )}
              {f === "once" && (
                <>
                  <CalendarDays className="h-3 w-3" /> Puntuales
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" ? (
        <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border">
              <div className="p-2" />
              {DAYS_ES.map((day) => (
                <div key={day} className="p-3 text-center text-xs font-semibold text-foreground border-l border-border">
                  {day}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative">
              {TIME_SLOTS.map((slot) => (
                <div key={slot} className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border last:border-0">
                  <div className="p-2 text-right pr-3">
                    <span className="text-[10px] text-muted-foreground">{slot}</span>
                  </div>
                  {DAYS_ES.map((day) => {
                    const classesInSlot = filteredClasses.filter(
                      (c) => c.day === day && parseStartHour(c.time) === parseInt(slot)
                    );
                    return (
                      <div key={`${day}-${slot}`} className="border-l border-border min-h-[52px] p-0.5 relative">
                        {classesInSlot.map((cls) => (
                          <ClassCard
                            key={cls.id}
                            {...cls}
                            compact
                            selected={selectedClassIds.includes(cls.id)}
                            onSelect={() => onToggleClass(cls.id)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {DAYS_ES.map((day) => {
            const dayClasses = filteredClasses
              .filter((c) => c.day === day)
              .sort((a, b) => parseStartHour(a.time) - parseStartHour(b.time));

            if (dayClasses.length === 0) return null;

            return (
              <div key={day}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{day}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dayClasses.map((cls) => (
                    <ClassCard
                      key={cls.id}
                      {...cls}
                      selected={selectedClassIds.includes(cls.id)}
                      onSelect={() => onToggleClass(cls.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
