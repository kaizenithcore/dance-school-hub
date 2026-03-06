import { StudentRecord } from "@/lib/data/mockStudents";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentRecord | null;
  onConfirm: () => void;
}

export function DeleteStudentModal({ open, onOpenChange, student, onConfirm }: DeleteStudentModalProps) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Eliminar Alumno</DialogTitle>
          <DialogDescription className="text-center">
            ¿Estás seguro de que querés eliminar a <strong>{student.name}</strong>? Esta acción no se puede deshacer.
            {student.enrolledClasses.length > 0 && (
              <span className="block mt-2 text-destructive font-medium">
                ⚠ Este alumno tiene {student.enrolledClasses.length} clase{student.enrolledClasses.length > 1 ? "s" : ""} inscripta{student.enrolledClasses.length > 1 ? "s" : ""}.
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
