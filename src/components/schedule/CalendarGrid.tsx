import { useCallback, useRef, useState } from "react";
import { ScheduleBlock } from "@/hooks/useScheduleEditor";
import { ClassBlock } from "@/components/schedule/ClassBlock";
import { cn } from "@/lib/utils";

const DEFAULT_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
const DEFAULT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
const PIXELS_PER_HOUR = 64;

interface CalendarGridProps {
  blocks: ScheduleBlock[];
  onMoveBlock: (blockId: string, day: string, startHour: number) => void;
  onAddBlock: (block: Omit<ScheduleBlock, "id" | "color">) => void;
  onRemoveBlock: (blockId: string) => void;
  onToggleLock: (blockId: string) => void;
  hasConflict: (blockId: string, day: string, startHour: number, duration: number, roomId: string) => boolean;
  selectedRoom: string;
  defaultRoomId?: string;
  defaultRoomName?: string;
  days?: string[];
  hours?: number[];
}

export function CalendarGrid({
  blocks,
  onMoveBlock,
  onAddBlock,
  onRemoveBlock,
  onToggleLock,
  hasConflict,
  selectedRoom,
  defaultRoomId,
  defaultRoomName,
  days,
  hours,
}: CalendarGridProps) {
  const gridDays = days && days.length > 0 ? days : [...DEFAULT_DAYS];
  const gridHours = hours && hours.length > 0 ? hours : [...DEFAULT_HOURS];
  const [dragOverCell, setDragOverCell] = useState<{ day: string; hour: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent, day: string, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell({ day, hour });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, day: string, hour: number) => {
      e.preventDefault();
      setDragOverCell(null);

      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));

        if (data.type === "new") {
          const blockRoomId = data.roomId || (selectedRoom === "all" ? defaultRoomId : selectedRoom);
          const blockRoomName = data.roomName || defaultRoomName || "Sin aula";

          if (!blockRoomId) {
            return;
          }

          onAddBlock({
            classId: data.classId,
            name: data.name,
            teacher: data.teacher,
            day,
            startHour: hour,
            duration: data.duration,
            roomId: blockRoomId,
            room: blockRoomName,
          });
        } else if (data.type === "move") {
          const draggedBlock = blocks.find((block) => block.id === data.blockId);
          if (draggedBlock?.isLocked) {
            return;
          }
          onMoveBlock(data.blockId, day, hour);
        }
      } catch {
        // Invalid drag data
      }
    },
    [onMoveBlock, onAddBlock, selectedRoom]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto" ref={gridRef}>
      <div className="min-w-[750px]">
        {/* Header */}
        <div
          className="grid border-b border-border sticky top-0 bg-card z-20"
          style={{ gridTemplateColumns: `56px repeat(${gridDays.length}, minmax(0, 1fr))` }}
        >
          <div className="p-2" />
          {gridDays.map((day) => (
            <div key={day} className="p-2.5 text-center text-xs font-semibold text-foreground border-l border-border">
              {day}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="relative">
          {gridHours.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-border last:border-0"
              style={{
                gridTemplateColumns: `56px repeat(${gridDays.length}, minmax(0, 1fr))`,
                height: `${PIXELS_PER_HOUR}px`,
              }}
            >
              {/* Time label */}
              <div className="flex items-start justify-end pr-2 pt-1">
                <span className="text-[10px] text-muted-foreground font-medium">{hour}:00</span>
              </div>

              {/* Day cells */}
              {gridDays.map((day) => {
                const isOver = dragOverCell?.day === day && dragOverCell?.hour === hour;
                // Find blocks starting at this hour for this day
                const cellBlocks = blocks.filter((b) => b.day === day && Math.floor(b.startHour) === hour);

                return (
                  <div
                    key={`${day}-${hour}`}
                    className={cn(
                      "border-l border-border relative transition-colors",
                      isOver && "bg-accent/50"
                    )}
                    onDragOver={(e) => handleDragOver(e, day, hour)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day, hour)}
                  >
                    {cellBlocks.map((block) => {
                      const offsetPx = (block.startHour - hour) * PIXELS_PER_HOUR;
                      const conflict = hasConflict(
                        block.id, block.day, block.startHour, block.duration, block.roomId
                      );
                      return (
                        <div key={block.id} style={{ position: "absolute", top: `${offsetPx}px`, left: 0, right: 0 }}>
                          <ClassBlock
                            block={block}
                            onRemove={() => onRemoveBlock(block.id)}
                            onToggleLock={() => onToggleLock(block.id)}
                            onDragStart={() => {}}
                            conflict={conflict}
                            pixelsPerHour={PIXELS_PER_HOUR}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
