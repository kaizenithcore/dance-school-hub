import { useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarDays, Users, DollarSign, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicClass } from "@/lib/api/publicEnrollment";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
const PIXELS_PER_HOUR = 80;

interface PublicScheduleSelectorProps {
  classes: PublicClass[];
  selectedClassIds: string[];
  onToggleClass: (classId: string) => void;
  error?: string;
}

interface ScheduleBlock {
  id: string;
  day: string;
  startHour: number;
  duration: number;
  room: string;
  class: PublicClass;
}

export function PublicScheduleSelector({
  classes,
  selectedClassIds,
  onToggleClass,
  error,
}: PublicScheduleSelectorProps) {
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const selectedClasses = classes.filter((c) => selectedClassIds.includes(c.id));

  // Group classes by schedule blocks
  const scheduleBlocks: ScheduleBlock[] = classes.flatMap((classItem) => {
    if (!classItem.schedules || classItem.schedules.length === 0) return [];
    return classItem.schedules.map((schedule) => ({
      ...schedule,
      class: classItem,
    }));
  });

  const roomNames = Array.from(new Set(scheduleBlocks.map((block) => block.room || "Sin sala")));

  const blocksByRoom = roomNames.reduce<Record<string, ScheduleBlock[]>>((acc, roomName) => {
    acc[roomName] = scheduleBlocks.filter((block) => (block.room || "Sin sala") === roomName);
    return acc;
  }, {});

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const isFull = event.currentTarget.getAttribute("data-is-full") === "true";
    if (isFull) return;

    const classId = event.currentTarget.getAttribute("data-class-id");
    // Toggle selection
    if (classId) {
      onToggleClass(classId);
    }
  }

  const getBlockStyle = (block: ScheduleBlock) => {
    const dayIndex = DAYS.indexOf(block.day as typeof DAYS[number]);
    if (dayIndex === -1) {
      return null;
    }

    const startWindow = HOURS[0];
    const endWindow = HOURS[HOURS.length - 1] + 1;
    const start = Math.max(block.startHour, startWindow);
    const end = Math.min(block.startHour + block.duration, endWindow);

    if (end <= start) {
      return null;
    }

    const top = (start - startWindow) * PIXELS_PER_HOUR + 4;
    const height = Math.max((end - start) * PIXELS_PER_HOUR - 48, 24);
    const dayWidth = 100 / DAYS.length;
    const left = `calc(56px + ${dayIndex * dayWidth}% + 4px)`;
    const width = `calc(${dayWidth}% - 16px)`;

    return {
      top: `${top}px`,
      left,
      width,
      height: `${height}px`,
    };
  };

  const renderRoomCalendar = (roomName: string, roomBlocks: ScheduleBlock[]) => (
    <div key={roomName} className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">Aula: {roomName}</h4>
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-x-auto">
        <div className="min-w-[750px]">
          {/* Header */}
          <div className="grid grid-cols-[56px_repeat(6,1fr)] border-b border-border bg-card z-10">
            <div className="p-2" />
            {DAYS.map((day) => (
              <div
                key={`${roomName}-${day}`}
                className="p-2.5 text-center text-xs font-semibold text-foreground border-l border-border"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={`${roomName}-${hour}`}
                className="grid grid-cols-[56px_repeat(6,1fr)] border-b border-border last:border-0"
                style={{ height: `${PIXELS_PER_HOUR}px` }}
              >
                {/* Time label */}
                <div className="flex items-start justify-center pt-2 text-[10px] font-medium text-muted-foreground">
                  {hour}:00
                </div>

                {/* Day columns */}
                {DAYS.map((day) => (
                  <div
                    key={`${roomName}-${hour}-${day}`}
                    className="border-l border-border hover:bg-accent/5 transition-colors relative"
                  />
                ))}
              </div>
            ))}

            {/* Schedule blocks */}
            {roomBlocks.map((block) => {
              const style = getBlockStyle(block);
              if (!style) return null;

              const isFull = block.class.enrolled_count >= block.class.capacity;
              const isSelected = selectedClassIds.includes(block.class.id);

              return (
                <button
                  key={`${roomName}-${block.class.id}-${block.id}`}
                  type="button"
                  onClick={handleClick}
                  disabled={isFull}
                  data-class-id={block.class.id}
                  data-is-full={isFull}
                  className={cn(
                    "absolute rounded-md border-2 p-2 text-left transition-all overflow-hidden",
                    "hover:shadow-md hover:z-10",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md z-10"
                      : "border-border bg-card hover:border-primary/50",
                    isFull && "opacity-50 cursor-not-allowed hover:border-border hover:shadow-none"
                  )}
                  style={style}
                >
                  <div className="flex flex-col h-full text-xs">
                    <div className="font-semibold truncate">{block.class.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {block.room}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                      <span className="text-[10px] font-medium">
                        €{(block.class.price_cents / 100).toFixed(0)}
                      </span>
                      <span
                        className={cn(
                          "text-[10px]",
                          isFull ? "text-destructive font-medium" : "text-muted-foreground"
                        )}
                      >
                        {block.class.enrolled_count}/{block.class.capacity}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCalendarView = () => (
    <div className="space-y-5">
      {roomNames.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay clases con horario asignado.
        </div>
      ) : (
        roomNames.map((roomName) => renderRoomCalendar(roomName, blocksByRoom[roomName] || []))
      )}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-5">
      {roomNames.map((roomName) => {
        const roomClassIds = new Set((blocksByRoom[roomName] || []).map((block) => block.class.id));
        const roomClasses = classes.filter((classItem) => roomClassIds.has(classItem.id));

        return (
          <div key={`list-${roomName}`} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Aula: {roomName}</h4>
            <div className="space-y-2">
              {roomClasses.map((classItem) => {
        const isFull = classItem.enrolled_count >= classItem.capacity;
        const isSelected = selectedClassIds.includes(classItem.id);
        const roomSchedules = (classItem.schedules || []).filter(
          (schedule) => (schedule.room || "Sin sala") === roomName
        );
        const hasSchedules = roomSchedules.length > 0;

        return (
          <button
            key={`${roomName}-${classItem.id}`}
            type="button"
            onClick={handleClick}
            disabled={isFull}
            data-class-id={classItem.id}
            data-is-full={isFull}
            className={cn(
              "w-full rounded-lg border-2 p-4 text-left transition-all",
              "hover:shadow-md",
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/30",
              isFull && "opacity-50 cursor-not-allowed hover:border-border hover:shadow-none"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">{classItem.name}</h4>
                  {isFull && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Llena
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {classItem.discipline} - {classItem.category}
                </p>

                {hasSchedules && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {roomSchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center gap-1.5 text-[11px] rounded-md bg-accent/50 px-2 py-1"
                      >
                        <CalendarDays className="h-3 w-3" />
                        <span>
                          {schedule.day} {schedule.startHour}:00
                        </span>
                        <Clock className="h-3 w-3 ml-1" />
                        <span>{schedule.duration}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <DollarSign className="h-3.5 w-3.5" />
                  {(classItem.price_cents / 100).toFixed(2)}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    isFull ? "text-destructive font-medium" : "text-muted-foreground"
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  {classItem.enrolled_count}/{classItem.capacity}
                </div>
              </div>
            </div>
          </button>
        );
      })}
            </div>
          </div>
        );
      })}

      {roomNames.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay clases con horario asignado.
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "calendar"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendario
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "list"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Lista
          </button>
        </div>

        {selectedClasses.length > 0 && (
          <div className="ml-auto text-xs text-muted-foreground">
            Seleccionadas: <span className="font-medium text-foreground">{selectedClasses.length}</span>
          </div>
        )}
      </div>

      {/* Content */}
      {view === "calendar" ? renderCalendarView() : renderListView()}

      {/* Error message */}
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}

      {/* Selected class summary */}
      {selectedClasses.length > 0 && (
        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="font-semibold mb-2">Clases seleccionadas ({selectedClasses.length})</h4>
          <div className="space-y-2">
            {selectedClasses.map((selectedClass) => (
              <div key={selectedClass.id} className="grid grid-cols-2 gap-2 text-sm rounded-md bg-background p-2">
                <div>
                  <span className="text-muted-foreground">Clase:</span>{" "}
                  <strong>{selectedClass.name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Disciplina:</span>{" "}
                  <strong>{selectedClass.discipline}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Precio:</span>{" "}
                  <strong>€{(selectedClass.price_cents / 100).toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Cupos:</span>{" "}
                  <strong>
                    {selectedClass.enrolled_count}/{selectedClass.capacity}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
