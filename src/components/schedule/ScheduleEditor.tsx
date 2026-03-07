import { useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import { ClassSidebar } from "./ClassSidebar";
import { RoomSelector } from "./RoomSelector";
import { useScheduleEditor } from "@/hooks/useScheduleEditor";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

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
          />
        </div>
      </div>

      {rooms.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay aulas activas. Crea al menos un aula para armar horarios.</p>
      )}
      {isDragging && (
        <p className="text-xs text-muted-foreground">Arrastra una clase al calendario para crear un bloque.</p>
      )}
    </div>
  );
}
