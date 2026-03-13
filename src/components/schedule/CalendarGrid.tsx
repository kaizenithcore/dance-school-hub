import { useCallback, useMemo, useRef, useState } from "react";
import { ScheduleBlock } from "@/hooks/useScheduleEditor";
import { ClassBlock } from "@/components/schedule/ClassBlock";
import { cn } from "@/lib/utils";

const DEFAULT_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
const DEFAULT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
const PIXELS_PER_HOUR = 60;
const ROOM_COLORS = [
  "hsl(210 92% 55%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(280 60% 55%)",
  "hsl(190 80% 45%)",
  "hsl(330 70% 55%)",
] as const;

interface CalendarGridProps {
  blocks: ScheduleBlock[];
  previewBlocks?: ScheduleBlock[];
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
  previewBlocks = [],
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
  const isAllRoomsView = selectedRoom === "all";
  const [dragOverCell, setDragOverCell] = useState<{ day: string; hour: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const roomColorById = useMemo(() => {
    const roomIds = Array.from(new Set(blocks.map((block) => block.roomId))).sort();
    return roomIds.reduce<Record<string, string>>((acc, roomId, index) => {
      acc[roomId] = ROOM_COLORS[index % ROOM_COLORS.length];
      return acc;
    }, {});
  }, [blocks]);

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
    [blocks, defaultRoomId, defaultRoomName, onMoveBlock, onAddBlock, selectedRoom]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  const handleRowDragStart = useCallback((e: React.DragEvent, block: ScheduleBlock) => {
    if (block.isLocked) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "move",
        blockId: block.id,
        duration: block.duration,
      })
    );
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
                ...(isAllRoomsView
                  ? { minHeight: `${PIXELS_PER_HOUR}px` }
                  : { height: `${PIXELS_PER_HOUR}px` }),
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
                const cellPreviewBlocks = previewBlocks.filter((b) => b.day === day && Math.floor(b.startHour) === hour);

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
                    {isAllRoomsView ? (
                      <div className="space-y-1 p-1">
                        {cellBlocks.map((block) => {
                          const roomColor = roomColorById[block.roomId] || block.color;
                          return (
                          <div
                            key={block.id}
                            draggable={!block.isLocked}
                            onDragStart={(event) => handleRowDragStart(event, block)}
                            className={cn(
                              "h-[60px] rounded border border-border px-2 py-1 text-[10px] leading-tight border-l-[3px]",
                              block.isLocked ? "cursor-default opacity-85" : "cursor-grab active:cursor-grabbing"
                            )}
                            style={{
                              borderLeftColor: roomColor,
                              backgroundColor: `${roomColor}15`,
                            }}
                          >
                            <p className="truncate font-medium text-foreground">{block.name}</p>
                            <p className="truncate text-muted-foreground">{block.room}</p>
                          </div>
                          );
                        })}
                        {cellPreviewBlocks.map((block) => {
                          const roomColor = roomColorById[block.roomId] || block.color;
                          return (
                          <div
                            key={block.id}
                            className="h-[60px] rounded border border-dashed px-2 py-1 text-[10px] leading-tight opacity-40 border-l-[3px]"
                            style={{
                              borderColor: `${roomColor}66`,
                              borderLeftColor: roomColor,
                              backgroundColor: `${roomColor}15`,
                            }}
                          >
                            <p className="truncate font-medium text-foreground">{block.name}</p>
                            <p className="truncate text-muted-foreground">{block.room}</p>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <>
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

                        {cellPreviewBlocks.map((block) => {
                          const offsetPx = (block.startHour - hour) * PIXELS_PER_HOUR;
                          return (
                            <div
                              key={block.id}
                              style={{ position: "absolute", top: `${offsetPx}px`, left: 0, right: 0 }}
                              className="pointer-events-none"
                            >
                              <ClassBlock
                                block={block}
                                onRemove={() => {}}
                                onToggleLock={() => {}}
                                onDragStart={() => {}}
                                pixelsPerHour={PIXELS_PER_HOUR}
                                isPreview
                              />
                            </div>
                          );
                        })}
                      </>
                    )}
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
