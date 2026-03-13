import { X, GripVertical, MapPin, Lock, LockOpen } from "lucide-react";
import { ScheduleBlock } from "@/hooks/useScheduleEditor";
import { cn } from "@/lib/utils";

interface ClassBlockProps {
  block: ScheduleBlock;
  onRemove: () => void;
  onToggleLock: () => void;
  onDragStart: (e: React.DragEvent) => void;
  conflict?: boolean;
  pixelsPerHour: number;
  isPreview?: boolean;
}

export function ClassBlock({ block, onRemove, onToggleLock, onDragStart, conflict, pixelsPerHour, isPreview = false }: ClassBlockProps) {
  const height = block.duration * pixelsPerHour/1.5;

  return (
    <div
      draggable={!isPreview && !block.isLocked}
      onDragStart={(e) => {
        if (isPreview) {
          e.preventDefault();
          return;
        }
        if (block.isLocked) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("application/json", JSON.stringify({
          type: "move",
          blockId: block.id,
          duration: block.duration,
        }));
        onDragStart(e);
      }}
      style={{
        height: `${height}px`,
        backgroundColor: `${block.color}15`,
        borderLeftColor: block.color,
      }}
      className={cn(
        "absolute left-0.5 right-0.5 rounded-md border border-l-[3px] px-2 py-1.5 transition-shadow hover:shadow-medium overflow-hidden group z-10",
        isPreview && "opacity-40 border-dashed pointer-events-none",
        block.isLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        conflict
          ? "border-destructive bg-destructive/10 ring-1 ring-destructive/30"
          : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{block.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{block.teacher}</p>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span>{block.room}</span>
          </div>
        </div>
        {!isPreview ? (
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
              className={cn(
                "opacity-0 group-hover:opacity-100 text-muted-foreground transition-all",
                block.isLocked ? "opacity-100 text-amber-600" : "hover:text-foreground"
              )}
              title={block.isLocked ? "Desbloquear bloque" : "Bloquear bloque"}
            >
              {block.isLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
            </button>
            {!block.isLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                title="Eliminar bloque"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : null}
      </div>
      {conflict && (
        <p className="text-[9px] font-medium text-destructive mt-1">⚠ Conflicto de horario</p>
      )}
      {/* Resize handle */}
      {!isPreview && !block.isLocked && (
        <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-2.5 w-2.5 text-muted-foreground rotate-90" />
        </div>
      )}
    </div>
  );
}
