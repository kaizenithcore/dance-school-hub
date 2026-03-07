import { TeacherRecord } from "@/lib/data/mockTeachers";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: TeacherRecord | null;
  onConfirm: () => void;
}

export function DeleteTeacherModal({ open, onOpenChange, teacher, onConfirm }: DeleteTeacherModalProps) {
  if (!teacher) return null;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Eliminar profesor</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-4">
            ¿Estás seguro de que deseas eliminar a <strong>{teacher.name}</strong>?
            <br />
            <span className="text-xs text-muted-foreground mt-2 block">
              Esta acción no se puede deshacer. Se eliminará toda la información del profesor.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-2 justify-end">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
            Eliminar
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
