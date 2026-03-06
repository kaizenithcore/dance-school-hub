import { ClassRecord } from "@/lib/data/mockClassRecords";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData: ClassRecord | null;
  onConfirm: () => void;
}

export function DeleteClassModal({ open, onOpenChange, classData, onConfirm }: DeleteClassModalProps) {
  if (!classData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Eliminar Clase</DialogTitle>
          <DialogDescription className="text-center">
            ¿Estás seguro de que querés eliminar <strong>{classData.name}</strong>? Esta acción no se puede deshacer.
            {classData.enrolled > 0 && (
              <span className="block mt-2 text-destructive font-medium">
                ⚠ Esta clase tiene {classData.enrolled} alumno{classData.enrolled > 1 ? "s" : ""} inscripto{classData.enrolled > 1 ? "s" : ""}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false); }}>Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
