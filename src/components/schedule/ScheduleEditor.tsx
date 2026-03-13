import { useEffect, useMemo, useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { ClassSidebar } from "./ClassSidebar";
import { RoomSelector } from "./RoomSelector";
import { useScheduleEditor } from "@/hooks/useScheduleEditor";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings } from "@/lib/api/settings";
import type { ScheduleProposal } from "@/lib/api/schedules";
import type { ScheduleBlock } from "@/hooks/useScheduleEditor";

const DAY_BY_WEEKDAY: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

function toDecimalHour(time: string): number {
  const [h, m] = time.split(":").map((part) => Number.parseInt(part || "0", 10));
  const safeH = Number.isFinite(h) ? h : 0;
  const safeM = Number.isFinite(m) ? m : 0;
  return safeH + safeM / 60;
}

interface ScheduleEditorProps {
  previewProposal?: ScheduleProposal | null;
}

export function ScheduleEditor({ previewProposal = null }: ScheduleEditorProps) {
  const {
    filteredBlocks,
    rooms,
    availableClasses,
    loading,
    selectedRoom,
    setSelectedRoom,
    addBlock,
    moveBlock,
    removeBlock,
    toggleLock,
    hasConflict,
    saveChanges,
  } = useScheduleEditor();

  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [workDays, setWorkDays] = useState<string[]>(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]);
  const [hourRange, setHourRange] = useState<{ start: number; end: number }>({ start: 8, end: 20 });

  useEffect(() => {
    void (async () => {
      try {
        const settings = await getSchoolSettings();
        const schedule = (settings?.schedule || {}) as Record<string, unknown>;

        const nextDays = Array.isArray(schedule.workDays)
          ? schedule.workDays.filter((day): day is string => typeof day === "string" && day.trim().length > 0)
          : [];

        const startRaw = typeof schedule.startHour === "string" ? schedule.startHour : "08:00";
        const endRaw = typeof schedule.endHour === "string" ? schedule.endHour : "21:00";
        const start = Number.parseInt(startRaw.split(":")[0] || "8", 10);
        const end = Number.parseInt(endRaw.split(":")[0] || "21", 10);

        if (nextDays.length > 0) {
          setWorkDays(nextDays);
        }

        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
          setHourRange({ start, end: end - 1 });
        }
      } catch {
        // Keep defaults if settings are not available
      }
    })();
  }, []);

  const gridHours = useMemo(() => {
    const hours: number[] = [];
    for (let hour = hourRange.start; hour <= hourRange.end; hour += 1) {
      hours.push(hour);
    }
    return hours;
  }, [hourRange.end, hourRange.start]);

  const previewBlocks = useMemo<ScheduleBlock[]>(() => {
    if (!previewProposal || previewProposal.creates.length === 0) {
      return [];
    }

    const classById = new Map(availableClasses.map((klass) => [klass.id, klass]));
    const roomById = new Map(rooms.map((room) => [room.id, room]));

    const mapped = previewProposal.creates.map((operation, index) => {
      const classInfo = classById.get(operation.classId);
      const startHour = toDecimalHour(operation.startTime);
      const endHour = toDecimalHour(operation.endTime);
      const duration = Math.max(0.5, endHour - startHour);
      const day = DAY_BY_WEEKDAY[operation.weekday] || "Lunes";
      const room = roomById.get(operation.roomId);

      return {
        id: `preview-${previewProposal.id}-${index}`,
        classId: operation.classId,
        name: classInfo?.name || "Clase",
        teacher: classInfo?.teacher || "Sin profesor",
        day,
        startHour,
        duration,
        roomId: operation.roomId,
        room: room?.name || classInfo?.roomName || "Sin aula",
        color: "hsl(210 92% 55%)",
        isPersisted: false,
        isLocked: false,
      } satisfies ScheduleBlock;
    });

    return selectedRoom === "all" ? mapped : mapped.filter((block) => block.roomId === selectedRoom);
  }, [availableClasses, previewProposal, rooms, selectedRoom]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const result = await saveChanges();
      if (!result.saved) {
        toast.info("No hay cambios para guardar");
        return;
      }
      if (result.errors > 0) {
        toast.warning(
          `Guardado parcial: ${result.created} creados, ${result.updated} actualizados, ${result.deleted} eliminados, ${result.errors} errores`
        );
        return;
      }
      toast.success(
        `Horario guardado: ${result.created} creados, ${result.updated} actualizados, ${result.deleted} eliminados`
      );
    } catch (error) {
      console.error("Error saving schedule:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`No se pudo guardar el horario: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const defaultRoom = rooms[0];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RoomSelector rooms={rooms} selected={selectedRoom} onChange={setSelectedRoom} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info("Función de deshacer próximamente")}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Deshacer
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || loading}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        <ClassSidebar
          classes={availableClasses}
          defaultRoomId={defaultRoom?.id}
          defaultRoomName={defaultRoom?.name}
          onDragStart={() => setIsDragging(true)}
        />
        <div className="flex-1 min-w-0">
          <CalendarGrid
            blocks={filteredBlocks}
            previewBlocks={previewBlocks}
            onMoveBlock={moveBlock}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
            onToggleLock={toggleLock}
            hasConflict={hasConflict}
            selectedRoom={selectedRoom}
            defaultRoomId={defaultRoom?.id}
            defaultRoomName={defaultRoom?.name}
            days={workDays}
            hours={gridHours}
          />
        </div>
      </div>

      {!loading && rooms.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay aulas activas. Crea al menos un aula para armar horarios.</p>
      )}
      {isDragging && (
        <p className="text-xs text-muted-foreground">Arrastra una clase al calendario para crear un bloque.</p>
      )}
    </div>
  );
}
