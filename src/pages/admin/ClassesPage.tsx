import { useState, useCallback, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ClassesTable } from "@/components/tables/ClassesTable";
import { ClassFormModal } from "@/components/tables/ClassFormModal";
import { DeleteClassModal } from "@/components/tables/DeleteClassModal";
import { ClassPreviewDrawer } from "@/components/tables/ClassPreviewDrawer";
import { ClassRecord } from "@/lib/data/mockClassRecords";
import { createClass, deleteClass, getClasses, updateClass } from "@/lib/api/classes";
import { getDisciplines } from "@/lib/api/disciplines";
import { getCategories } from "@/lib/api/categories";
import { Button } from "@/components/ui/button";
import { CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null);
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassRecord | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Load classes from API
  useEffect(() => {
    const loadClasses = async () => {
      setLoading(true);
      try {
        const [classesData, disciplinesData, categoriesData] = await Promise.all([
          getClasses(),
          getDisciplines(),
          getCategories(),
        ]);

        // Create lookup maps
        const disciplineMap = new Map(disciplinesData.map((d) => [d.id, d.name]));
        const categoryMap = new Map(categoriesData.map((c) => [c.id, c.name]));

        const mappedClasses: ClassRecord[] = (classesData || []).map((cls) => ({
          id: cls.id,
          name: cls.name,
          discipline: cls.discipline ? (disciplineMap.get(cls.discipline) || cls.discipline) : "General",
          teacher: cls.teacher?.name || "Sin asignar",
          category: cls.category ? (categoryMap.get(cls.category) || cls.category) : "General",
          price: cls.price,
          capacity: cls.capacity,
          room: "Sin sala",
          status: cls.status,
          enrolled: 0,
        }));
        setClasses(mappedClasses);
      } catch (error) {
        console.error("Error loading classes:", error);
        toast.error("Error al cargar clases");
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, []);

  const handleCreate = () => {
    setEditingClass(null);
    setFormOpen(true);
  };

  const handlePreview = (cls: ClassRecord) => {
    setSelectedClass(cls);
    setPreviewOpen(true);
  };

  const handleEdit = (cls: ClassRecord) => {
    setEditingClass(cls);
    setFormOpen(true);
  };

  const handleDelete = (cls: ClassRecord) => {
    setDeletingClass(cls);
    setDeleteOpen(true);
  };

  const handleSave = useCallback(async (data: Omit<ClassRecord, "id" | "enrolled"> & { discipline_id?: string; category_id?: string; teacher_id?: string }): Promise<boolean> => {
    try {
      if (editingClass) {
        // Update existing
        const result = await updateClass(editingClass.id, {
          name: data.name,
          discipline_id: data.discipline_id || data.discipline,
          category_id: data.category_id || data.category,
          teacher_id: data.teacher_id,
          price: data.price,
          capacity: data.capacity,
          status: data.status,
        });
        if (result) {
          setClasses((prev) =>
            prev.map((c) => (c.id === editingClass.id ? { ...c, ...data } : c))
          );
          toast.success("Clase actualizada exitosamente");
          return true;
        }
        toast.error("No se pudo actualizar la clase");
        return false;
      } else {
        // Create new
        const result = await createClass({
          name: data.name,
          discipline_id: data.discipline_id || data.discipline,
          category_id: data.category_id || data.category,
          teacher_id: data.teacher_id,
          price: data.price,
          capacity: data.capacity,
          status: data.status,
        });
        if (result) {
          const newClass: ClassRecord = {
            ...data,
            id: result.id,
            enrolled: 0,
          };
          setClasses((prev) => [newClass, ...prev]);
          toast.success("Clase creada exitosamente");
          return true;
        }
        toast.error("No se pudo crear la clase");
        return false;
      }
    } catch (error) {
      toast.error("Error al guardar la clase");
      console.error(error);
      return false;
    }
  }, [editingClass]);

  const handleConfirmDelete = useCallback(async () => {
    if (deletingClass) {
      try {
        const success = await deleteClass(deletingClass.id);
        if (success) {
          setClasses((prev) => prev.filter((c) => c.id !== deletingClass.id));
          toast.success("Clase eliminada");
        }
      } catch (error) {
        toast.error("Error al eliminar la clase");
        console.error(error);
      }
    }
  }, [deletingClass]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const targetId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!targetId || !action) {
      return;
    }

    const targetClass = classes.find((cls) => cls.id === targetId);
    if (!targetClass) {
      return;
    }

    if (action === "preview") {
      handlePreview(targetClass);
    } else if (action === "edit") {
      handleEdit(targetClass);
    } else if (action === "delete") {
      handleDelete(targetClass);
    }

    setSearchParams({}, { replace: true });
  }, [loading, classes, searchParams, setSearchParams]);

  return (
    <PageContainer
      title="Clases"
      description="Gestiona tu catálogo de clases"
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/reception")}>
            <CalendarClock className="h-4 w-4 mr-1" /> Hoja de asistencia
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nueva Clase
          </Button>
        </>
      }
    >
      <ClassesTable
        classes={classes}
        onPreview={handlePreview}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ClassPreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        classData={selectedClass}
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
