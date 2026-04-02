import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarDays, Users, DollarSign, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicClass } from "@/lib/api/publicEnrollment";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 21;
const PIXELS_PER_HOUR = 90;
const COLLAPSED_GAP_ROW_HEIGHT = 34;

type TimelineRow =
  | { kind: "hour"; hour: number }
  | { kind: "gap"; startHour: number; endHour: number };

interface PublicScheduleSelectorProps {
  classes: PublicClass[];
  selectedClassIds: string[];
  onToggleClass: (selectionId: string, linkedSelectionIds?: string[]) => void;
  error?: string;
  scheduleConfig?: {
    preferredView: "calendar" | "list";
    recurringSelectionMode: "linked" | "single_day";
    recurringClassOverrides: string[];
    startHour?: string;
    endHour?: string;
    calendarFields: {
      showDiscipline: boolean;
      showCategory: boolean;
      showRoom: boolean;
      showCapacity: boolean;
      showPrice: boolean;
      showSelectedStudents: boolean;
    };
  };
}

interface ScheduleBlock {
  id: string;
  day: string;
  startHour: number;
  duration: number;
  room: string;
  branchName?: string;
  class: PublicClass;
}

function resolveClassLevel(classItem: PublicClass) {
  return classItem.level || classItem.category || "General";
}

function resolveTeacherName(classItem: PublicClass) {
  return classItem.teacherName || classItem.teacher_name;
}

export function PublicScheduleSelector({
  classes,
  selectedClassIds,
  onToggleClass,
  error,
  scheduleConfig,
}: PublicScheduleSelectorProps) {
  const effectiveConfig = scheduleConfig ?? {
    preferredView: "calendar" as const,
    recurringSelectionMode: "linked" as const,
    recurringClassOverrides: [] as string[],
    startHour: "08:00",
    endHour: "21:00",
    calendarFields: {
      showDiscipline: true,
      showCategory: false,
      showRoom: true,
      showCapacity: true,
      showPrice: true,
      showSelectedStudents: true,
    },
  };

  const parseHour = (value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const [rawHour] = value.split(":");
    const parsed = Number(rawHour);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const startHourWindow = parseHour(effectiveConfig.startHour, DEFAULT_START_HOUR);
  const endHourWindow = parseHour(effectiveConfig.endHour, DEFAULT_END_HOUR);
  const safeStart = Math.max(0, Math.min(startHourWindow, 23));
  const safeEnd = Math.max(safeStart + 1, Math.min(endHourWindow, 24));
  const hours = Array.from({ length: safeEnd - safeStart }, (_, i) => safeStart + i);

  const [view, setView] = useState<"calendar" | "list">(effectiveConfig.preferredView);

  const selectedClasses = classes.filter((c) =>
    selectedClassIds.includes(c.id) || selectedClassIds.some((selectionId) => selectionId.split("::")[0] === c.id)
  );

  // Group classes by schedule blocks
  const scheduleBlocks: ScheduleBlock[] = classes.flatMap((classItem) => {
    if (!classItem.schedules || classItem.schedules.length === 0) return [];
    return classItem.schedules.map((schedule) => ({
      ...schedule,
      class: classItem,
      branchName: schedule.branchName,
    }));
  });

  const roomNames = Array.from(new Set(scheduleBlocks.map((block) => block.room || "Sin aula")));

  const sortedRoomNames = useMemo(() => {
    const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
    return [...roomNames].sort((a, b) => collator.compare(a, b));
  }, [roomNames]);

  const blocksByRoom = roomNames.reduce<Record<string, ScheduleBlock[]>>((acc, roomName) => {
    acc[roomName] = scheduleBlocks.filter((block) => (block.room || "Sin aula") === roomName);
    return acc;
  }, {});

  const recurringOverrides = new Set(effectiveConfig.recurringClassOverrides || []);

  const allowSingleDayForClass = (classId: string) => {
    if (effectiveConfig.recurringSelectionMode === "single_day") {
      return !recurringOverrides.has(classId);
    }
    return recurringOverrides.has(classId);
  };

  const getSelectionIdsForClass = (classItem: PublicClass, selectedScheduleId?: string) => {
    const schedules = classItem.schedules || [];
    const linkedSelection = schedules.length > 1 && !allowSingleDayForClass(classItem.id);

    if (!linkedSelection) {
      if (selectedScheduleId) return [`${classItem.id}::${selectedScheduleId}`];
      return [classItem.id];
    }

    return schedules.map((schedule) => `${classItem.id}::${schedule.id}`);
  };

  const hasSelectionForClass = (classItem: PublicClass, scheduleId?: string) => {
    const selectionIds = getSelectionIdsForClass(classItem, scheduleId);
    return selectionIds.some((selectionId) => selectedClassIds.includes(selectionId));
  };

  const handleToggleBlock = (block: ScheduleBlock) => {
    const isFull = block.class.enrolled_count >= block.class.capacity;
    if (isFull) return;

    const selectionIds = getSelectionIdsForClass(block.class, block.id);
    onToggleClass(selectionIds[0], selectionIds);
  };

  const buildTimelineRows = (roomBlocks: ScheduleBlock[]): TimelineRow[] => {
    const activeHours = new Set<number>();

    for (const block of roomBlocks) {
      const start = Math.max(block.startHour, safeStart);
      const end = Math.min(block.startHour + block.duration, safeEnd);
      if (end <= start) continue;

      const firstHour = Math.floor(start);
      const lastHour = Math.ceil(end);
      for (let hour = firstHour; hour < lastHour; hour += 1) {
        if (hour >= safeStart && hour < safeEnd) {
          activeHours.add(hour);
        }
      }
    }

    const rows: TimelineRow[] = [];
    let hour = safeStart;

    while (hour < safeEnd) {
      if (activeHours.has(hour)) {
        rows.push({ kind: "hour", hour });
        hour += 1;
        continue;
      }

      let gapEnd = hour;
      while (gapEnd < safeEnd && !activeHours.has(gapEnd)) {
        gapEnd += 1;
      }

      const gapLength = gapEnd - hour;
      if (gapLength > 2) {
        rows.push({ kind: "gap", startHour: hour, endHour: gapEnd });
      } else {
        for (let h = hour; h < gapEnd; h += 1) {
          rows.push({ kind: "hour", hour: h });
        }
      }

      hour = gapEnd;
    }

    return rows;
  };

  const getTimelineOffset = (rows: TimelineRow[], hourValue: number) => {
    let offset = 0;

    for (const row of rows) {
      if (row.kind === "hour") {
        const rowStart = row.hour;
        const rowEnd = row.hour + 1;

        if (hourValue <= rowStart) {
          return offset;
        }
        if (hourValue < rowEnd) {
          return offset + (hourValue - rowStart) * PIXELS_PER_HOUR;
        }

        offset += PIXELS_PER_HOUR;
        continue;
      }

      const rowStart = row.startHour;
      const rowEnd = row.endHour;
      if (hourValue <= rowStart) {
        return offset;
      }
      if (hourValue < rowEnd) {
        const ratio = (hourValue - rowStart) / Math.max(1, rowEnd - rowStart);
        return offset + ratio * COLLAPSED_GAP_ROW_HEIGHT;
      }

      offset += COLLAPSED_GAP_ROW_HEIGHT;
    }

    return offset;
  };

  const getBlockStyle = (block: ScheduleBlock, rows: TimelineRow[]) => {
    const dayIndex = DAYS.indexOf(block.day as typeof DAYS[number]);
    if (dayIndex === -1) {
      return null;
    }

    const start = Math.max(block.startHour, safeStart);
    const end = Math.min(block.startHour + block.duration, safeEnd);

    if (end <= start) {
      return null;
    }

    const startTop = getTimelineOffset(rows, start);
    const endTop = getTimelineOffset(rows, end);
    const top = startTop + 1;
    const height = Math.max(endTop - startTop - 48, 24);
    // Day columns have a 1px left border each; compensate accumulated borders to avoid right drift.
    const borderCompensationPx = dayIndex + 1;
    const left = `calc(56px + (${dayIndex} * ((100% - 56px) / ${DAYS.length})) + 5px - ${borderCompensationPx}px)`;
    const width = `calc(((100% - 56px) / ${DAYS.length}) - 8px)`;

    return {
      top: `${top}px`,
      left,
      width,
      height: `${height}px`,
    };
  };

  const renderRoomCalendar = (roomName: string, roomBlocks: ScheduleBlock[]) => {
    const timelineRows = buildTimelineRows(roomBlocks);

    return (
      <div key={roomName} className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Aula: {roomName}</h4>
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden max-h-[72vh]">
          <div className="min-w-[750px]">
          {/* Header */}
          <div className="grid grid-cols-[56px_repeat(6,1fr)] border-b border-border bg-card sticky top-0 z-20">
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
            {timelineRows.map((row, index) => {
              if (row.kind === "hour") {
                return (
                  <div
                    key={`${roomName}-hour-${row.hour}`}
                    className="grid grid-cols-[56px_repeat(6,1fr)] border-b border-border last:border-0"
                    style={{ height: `${PIXELS_PER_HOUR}px` }}
                  >
                    <div className="flex items-start justify-center pt-2 text-[10px] font-medium text-muted-foreground">
                      {row.hour}:00
                    </div>
                    {DAYS.map((day) => (
                      <div
                        key={`${roomName}-${row.hour}-${day}`}
                        className="border-l border-border hover:bg-accent/5 transition-colors relative"
                      />
                    ))}
                  </div>
                );
              }

              const hoursHidden = row.endHour - row.startHour;
              return (
                <div
                  key={`${roomName}-gap-${index}`}
                  className="grid grid-cols-[56px_repeat(6,1fr)] border-b border-dashed border-border/70 bg-muted/20"
                  style={{ height: `${COLLAPSED_GAP_ROW_HEIGHT}px` }}
                >
                  <div className="flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    +{hoursHidden}h
                  </div>
                  {DAYS.map((day) => (
                    <div key={`${roomName}-gap-${index}-${day}`} className="border-l border-border/70" />
                  ))}
                </div>
              );
            })}

            {/* Schedule blocks */}
            {roomBlocks.map((block) => {
              const style = getBlockStyle(block, timelineRows);
              if (!style) return null;

              const isFull = block.class.enrolled_count >= block.class.capacity;
              const isSelected = hasSelectionForClass(block.class, block.id);

              return (
                <button
                  key={`${roomName}-${block.class.id}-${block.id}`}
                  type="button"
                  onClick={() => handleToggleBlock(block)}
                  disabled={isFull}
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
                    {effectiveConfig.calendarFields.showDiscipline ? (
                      <div className="text-[10px] text-muted-foreground truncate">{block.class.discipline}</div>
                    ) : null}
                    {effectiveConfig.calendarFields.showCategory ? (
                      <div className="text-[10px] text-muted-foreground truncate">{block.class.category}</div>
                    ) : null}
                    {effectiveConfig.calendarFields.showRoom ? (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {block.branchName ? `${block.branchName} · ${block.room}` : block.room}
                      </div>
                    ) : null}
                    {(effectiveConfig.calendarFields.showPrice || effectiveConfig.calendarFields.showCapacity) ? (
                      <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                        {effectiveConfig.calendarFields.showPrice ? (
                          <span className="text-[10px] font-medium">
                            €{(block.class.price_cents / 100).toFixed(0)}
                          </span>
                        ) : <span />}
                        {effectiveConfig.calendarFields.showCapacity ? (
                          <span
                            className={cn(
                              "text-[10px]",
                              isFull ? "text-destructive font-medium" : "text-muted-foreground"
                            )}
                          >
                            {block.class.enrolled_count}/{block.class.capacity}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    );
  };

  const renderCalendarView = () => (
    <div className="space-y-5">
      {sortedRoomNames.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay clases con horario asignado.
        </div>
      ) : (
        sortedRoomNames.map((roomName) => renderRoomCalendar(roomName, blocksByRoom[roomName] || []))
      )}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-5">
      {sortedRoomNames.map((roomName) => {
        const roomClassIds = new Set((blocksByRoom[roomName] || []).map((block) => block.class.id));
        const roomClasses = classes.filter((classItem) => roomClassIds.has(classItem.id));

        return (
          <div key={`list-${roomName}`} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Aula: {roomName}</h4>
            <div className="space-y-3">
              {roomClasses.map((classItem) => {
        const isFull = classItem.enrolled_count >= classItem.capacity;
        const isSelected = hasSelectionForClass(classItem);
        const classLevel = resolveClassLevel(classItem);
        const teacherName = resolveTeacherName(classItem);
        const roomSchedules = (classItem.schedules || []).filter(
          (schedule) => (schedule.room || "Sin aula") === roomName
        );
        const hasSchedules = roomSchedules.length > 0;

        return (
          <div
            key={`${roomName}-${classItem.id}`}
            className={cn(
              "w-full rounded-xl border-2 p-4 text-left transition-all",
              "hover:shadow-md",
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/30",
              isFull && "opacity-50 hover:border-border hover:shadow-none"
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm truncate">{classItem.name}</h4>
                  {isFull && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Llena
                    </Badge>
                  )}
                </div>
                <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">Nivel: {classLevel}</span>
                  {effectiveConfig.calendarFields.showDiscipline ? (
                    <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">{classItem.discipline}</span>
                  ) : null}
                  {teacherName ? (
                    <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">Profesor: {teacherName}</span>
                  ) : null}
                </div>

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
                        {schedule.branchName ? <span>· {schedule.branchName}</span> : null}
                        <Clock className="h-3 w-3 ml-1" />
                        <span>{schedule.duration}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  {effectiveConfig.calendarFields.showPrice ? (
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <DollarSign className="h-3.5 w-3.5" />
                      {(classItem.price_cents / 100).toFixed(2)}
                    </div>
                  ) : null}
                  {effectiveConfig.calendarFields.showCapacity ? (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        isFull ? "text-destructive font-medium" : "text-muted-foreground"
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {classItem.enrolled_count}/{classItem.capacity}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onToggleClass(classItem.id)}
                    disabled={isFull}
                    className={cn(
                      "inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground hover:bg-accent/80",
                      isFull && "cursor-not-allowed opacity-70"
                    )}
                  >
                    {isSelected ? "Seleccionada" : "Seleccionar"}
                  </button>
                </div>
            </div>
          </div>
        );
      })}
            </div>
          </div>
        );
      })}

      {sortedRoomNames.length === 0 ? (
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
            {effectiveConfig.calendarFields.showSelectedStudents ? (
              <>
                Seleccionadas: <span className="font-medium text-foreground">{selectedClasses.length}</span>
              </>
            ) : null}
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
                {effectiveConfig.calendarFields.showDiscipline ? (
                  <div>
                    <span className="text-muted-foreground">Disciplina:</span>{" "}
                    <strong>{selectedClass.discipline}</strong>
                  </div>
                ) : <div />}
                <div>
                  {effectiveConfig.calendarFields.showPrice ? (
                    <>
                      <span className="text-muted-foreground">Precio:</span>{" "}
                      <strong>€{(selectedClass.price_cents / 100).toFixed(2)}</strong>
                    </>
                  ) : null}
                </div>
                <div>
                  {effectiveConfig.calendarFields.showCapacity ? (
                    <>
                      <span className="text-muted-foreground">Cupos:</span>{" "}
                      <strong>
                        {selectedClass.enrolled_count}/{selectedClass.capacity}
                      </strong>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
