import { useState } from "react";
import { useSessionSchedule } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, GripVertical, Trash2, Copy, ChevronDown, ChevronRight, RefreshCw, AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportSchedulePdf } from "@/lib/api/events";
import type { DanceEvent, ScheduleItem } from "@/lib/types/events";
import type { ScheduleItemInput } from "@/lib/api/events";

interface Props {
  event: DanceEvent;
  sessionId: string;
  scheduleActions: {
    createScheduleItem: (eventId: string, sessionId: string, data: ScheduleItemInput) => Promise<ScheduleItem>;
    updateScheduleItem: (eventId: string, sessionId: string, itemId: string, data: Partial<ScheduleItemInput>) => Promise<ScheduleItem>;
    deleteScheduleItem: (eventId: string, sessionId: string, itemId: string) => Promise<void>;
    moveScheduleItem: (eventId: string, sessionId: string, fromIndex: number, toIndex: number) => Promise<void>;
    recalculateSchedule: (eventId: string, sessionId: string) => Promise<void>;
  };
}

export function SessionScheduleEditor({ event, sessionId, scheduleActions }: Props) {
  const { schedule, addBlock, updateBlock, removeBlock, duplicateBlock, moveBlock, recalcTimes, totalDuration } = useSessionSchedule(event, sessionId, scheduleActions);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { toast } = useToast();

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      void moveBlock(dragIdx, idx);
      setDragIdx(idx);
    }
  };

  const handleDragEnd = () => setDragIdx(null);

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportSchedulePdf(event.id, sessionId);
      toast({
        title: "Éxito",
        description: "La escaleta ha sido descargada correctamente.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo descargar la escaleta";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const missingGroups = schedule.filter((b) => !b.groupName.trim());

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{schedule.length} actuaciones</span>
          <span>·</span>
          <span>{totalDuration} min totales</span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={recalcTimes}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recalcular tiempos
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ajusta los tiempos consecutivamente según la duración de cada bloque</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExportingPdf || schedule.length === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                {isExportingPdf ? "Generando..." : "Descargar PDF"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Descarga la escaleta como PDF imprimible</TooltipContent>
          </Tooltip>
          <Button size="sm" onClick={addBlock}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Añadir
          </Button>
        </div>
      </div>

      {missingGroups.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50/80 dark:bg-amber-950/30 dark:text-amber-400 rounded-md px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {missingGroups.length} {missingGroups.length === 1 ? "bloque sin nombre de grupo" : "bloques sin nombre de grupo"}
        </div>
      )}

      {schedule.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
          Pulsa "Añadir" para crear el primer bloque de la escaleta
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[32px_70px_60px_1fr_40px] sm:grid-cols-[32px_80px_70px_1fr_40px] items-center gap-1 px-2 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
            <span />
            <span>Hora</span>
            <span>Dur.</span>
            <span>Grupo</span>
            <span />
          </div>

          {schedule.map((block, idx) => (
            <ScheduleRow
              key={block.id}
              block={block}
              index={idx}
              isExpanded={expandedRow === block.id}
              onToggleExpand={() => setExpandedRow(expandedRow === block.id ? null : block.id)}
              onUpdate={(data) => updateBlock(block.id, data)}
              onRemove={() => { void removeBlock(block.id); }}
              onDuplicate={() => { void duplicateBlock(block.id); }}
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDragEnd={handleDragEnd}
              isDragging={dragIdx === idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  block: ScheduleItem;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (data: Partial<ScheduleItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function ScheduleRow({ block, isExpanded, onToggleExpand, onUpdate, onRemove, onDuplicate, onDragStart, onDragOver, onDragEnd, isDragging }: RowProps) {
  const hasMissingGroup = !block.groupName.trim();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn("border-t transition-colors", isDragging && "opacity-50 bg-accent/30")}
    >
      {/* Main row */}
      <div className="grid grid-cols-[32px_70px_60px_1fr_40px] sm:grid-cols-[32px_80px_70px_1fr_40px] items-center gap-1 px-2 py-1.5">
        <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex items-center justify-center">
          <GripVertical className="h-4 w-4" />
        </button>
        <Input
          type="time"
          value={block.time}
          onChange={(e) => onUpdate({ time: e.target.value })}
          className="h-8 text-xs px-1"
        />
        <Input
          type="number"
          min={1}
          value={block.duration}
          onChange={(e) => onUpdate({ duration: Math.max(1, Number(e.target.value)) })}
          className="h-8 text-xs px-1"
        />
        <div className="flex items-center gap-1">
          <button onClick={onToggleExpand} className="shrink-0 text-muted-foreground hover:text-foreground">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <Input
            value={block.groupName}
            onChange={(e) => onUpdate({ groupName: e.target.value })}
            placeholder="Nombre del grupo"
            className={cn("h-8 text-xs", hasMissingGroup && "border-destructive/50")}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onDuplicate} className="text-muted-foreground hover:text-foreground p-0.5">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Duplicar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-0.5">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Eliminar</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-10 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Coreografía</label>
            <Input value={block.choreography || ""} onChange={(e) => onUpdate({ choreography: e.target.value })} className="h-7 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Profesor/a</label>
            <Input value={block.teacher || ""} onChange={(e) => onUpdate({ teacher: e.target.value })} className="h-7 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Participantes</label>
            <Input type="number" min={0} value={block.participantsCount ?? ""} onChange={(e) => onUpdate({ participantsCount: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Sala / aula</label>
            <Input value={block.room || ""} onChange={(e) => onUpdate({ room: e.target.value })} className="h-7 text-xs" />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Notas</label>
            <Input value={block.notes || ""} onChange={(e) => onUpdate({ notes: e.target.value })} className="h-7 text-xs" />
          </div>
        </div>
      )}
    </div>
  );
}
