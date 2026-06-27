import { useState } from "react";
import { TeacherRecord } from "@/lib/data/mockTeachers";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: TeacherRecord | null;
  onConfirm: () => Promise<void> | void;
}

export function DeleteTeacherModal({ open, onOpenChange, teacher, onConfirm }: DeleteTeacherModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!teacher) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!isDeleting) onOpenChange(o); }}>
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
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Eliminar
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
