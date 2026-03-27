import { useCallback, useState, useEffect } from "react";
import { Class, TeacherRecord } from "@/lib/data/mockTeachers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Book, Plus, X } from "lucide-react";

interface AssignClassesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: TeacherRecord | null;
  classesCatalog: Class[];
  onSave: (classIds: string[]) => Promise<boolean>;
}

export function AssignClassesModal({
  open,
  onOpenChange,
  teacher,
  classesCatalog,
  onSave,
}: AssignClassesModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);

  useEffect(() => {
    if (teacher) {
      setAssignedClassIds(teacher.assignedClasses.map((c) => c.id));
    }
  }, [teacher, open]);

  const handleToggleClass = (classId: string) => {
    setAssignedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await onSave(assignedClassIds);
      if (ok) {
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [assignedClassIds, onSave, onOpenChange]);

  if (!teacher) return null;

  const assignedClasses = classesCatalog.filter((c) =>
    assignedClassIds.includes(c.id)
  );

  const availableClasses = classesCatalog.filter(
    (c) => !assignedClassIds.includes(c.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Asignar Clases a {teacher.name}
          </DialogTitle>
          <DialogDescription>
            Selecciona las clases que impartirá este profesor
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Assigned Classes */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">
                Clases Asignadas ({assignedClasses.length})
              </Label>
            </div>
            {assignedClasses.length === 0 ? (
              <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-border text-center text-sm text-muted-foreground">
                Sin clases asignadas
              </div>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {assignedClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.day} • {cls.time} • {cls.room}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 ml-2 text-destructive hover:text-destructive"
                      onClick={() => handleToggleClass(cls.id)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Available Classes */}
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div>
              <Label className="text-xs font-semibold">
                Clases Disponibles ({availableClasses.length})
              </Label>
            </div>
            <ScrollArea className="flex-1 border border-border rounded-lg p-3">
              <div className="space-y-2">
                {availableClasses.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Todas las clases han sido asignadas
                  </div>
                ) : (
                  availableClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleClass(cls.id)}
                    >
                      <Checkbox
                        checked={false}
                        disabled={isLoading}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{cls.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {cls.discipline}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {cls.day} • {cls.time}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cls.room} • {cls.students} estudiantes
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar ({assignedClasses.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
