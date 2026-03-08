import { useEffect, useMemo, useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { ClassSidebar } from "./ClassSidebar";
import { RoomSelector } from "./RoomSelector";
import { useScheduleEditor } from "@/hooks/useScheduleEditor";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings } from "@/lib/api/settings";

export function ScheduleEditor() {
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
      toast.error("No se pudo guardar el horario");
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
            onMoveBlock={moveBlock}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
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
