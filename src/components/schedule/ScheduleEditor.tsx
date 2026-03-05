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
    selectedRoom,
    setSelectedRoom,
    addBlock,
    moveBlock,
    removeBlock,
    hasConflict,
  } = useScheduleEditor();

  const [isDragging, setIsDragging] = useState(false);

  const handleSave = () => {
    // TODO: call API to save schedule
    toast.success("Horario guardado exitosamente");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RoomSelector selected={selectedRoom} onChange={setSelectedRoom} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info("Función de deshacer próximamente")}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Deshacer
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        <ClassSidebar onDragStart={() => setIsDragging(true)} />
        <div className="flex-1 min-w-0">
          <CalendarGrid
            blocks={filteredBlocks}
            onMoveBlock={moveBlock}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
            hasConflict={hasConflict}
            selectedRoom={selectedRoom}
          />
        </div>
      </div>
    </div>
  );
}
