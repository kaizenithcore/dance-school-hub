import { useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ClassesTable } from "@/components/tables/ClassesTable";
import { ClassFormModal } from "@/components/tables/ClassFormModal";
import { DeleteClassModal } from "@/components/tables/DeleteClassModal";
import { ClassRecord, MOCK_CLASS_RECORDS } from "@/lib/data/mockClassRecords";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>(MOCK_CLASS_RECORDS);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassRecord | null>(null);

  const handleCreate = () => {
    setEditingClass(null);
    setFormOpen(true);
  };

  const handleEdit = (cls: ClassRecord) => {
    setEditingClass(cls);
    setFormOpen(true);
  };

  const handleDelete = (cls: ClassRecord) => {
    setDeletingClass(cls);
    setDeleteOpen(true);
  };

  const handleSave = useCallback((data: Omit<ClassRecord, "id" | "enrolled">) => {
    if (editingClass) {
      setClasses((prev) =>
        prev.map((c) => (c.id === editingClass.id ? { ...c, ...data } : c))
      );
      toast.success("Clase actualizada exitosamente");
    } else {
      const newClass: ClassRecord = {
        ...data,
        id: `new-${Date.now()}`,
        enrolled: 0,
      };
      setClasses((prev) => [newClass, ...prev]);
      toast.success("Clase creada exitosamente");
    }
  }, [editingClass]);

  const handleConfirmDelete = useCallback(() => {
    if (deletingClass) {
      setClasses((prev) => prev.filter((c) => c.id !== deletingClass.id));
      toast.success("Clase eliminada");
    }
  }, [deletingClass]);

  return (
    <PageContainer
      title="Clases"
      description="Gestiona tu catálogo de clases"
      actions={
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Clase
        </Button>
      }
    >
      <ClassesTable
        classes={classes}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ClassFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        classData={editingClass}
        onSave={handleSave}
      />

      <DeleteClassModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        classData={deletingClass}
        onConfirm={handleConfirmDelete}
      />
    </PageContainer>
  );
}
