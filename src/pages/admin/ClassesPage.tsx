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
import { getRooms } from "@/lib/api/rooms";
import { getSchedules } from "@/lib/api/schedules";
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
        const [classesData, disciplinesData, categoriesData, roomsData, schedulesData] = await Promise.all([
          getClasses(),
          getDisciplines(),
          getCategories(),
          getRooms(),
          getSchedules(),
        ]);

        // Create lookup maps
        const disciplineMap = new Map(disciplinesData.map((d) => [d.id, d.name]));
        const categoryMap = new Map(categoriesData.map((c) => [c.id, c.name]));
        const roomMap = new Map(roomsData.map((r) => [r.id, r.name]));

        const scheduledByClass = new Map<string, number>();
        (schedulesData || []).forEach((schedule) => {
          scheduledByClass.set(
            schedule.class_id,
            (scheduledByClass.get(schedule.class_id) || 0) + 1
          );
        });

        const mappedClasses: ClassRecord[] = (classesData || []).map((cls) => {
          const teacherNames = (cls.teachers || []).map((teacher) => teacher.name).filter(Boolean);
          const teacherIds = cls.teacherIds || [];

          return {
            id: cls.id,
            name: cls.name,
            discipline: cls.discipline ? (disciplineMap.get(cls.discipline) || cls.discipline) : "General",
            disciplineId: cls.disciplineId || undefined,
            teacher: teacherNames.length > 0 ? teacherNames.join(", ") : "Sin asignar",
            teacherId: teacherIds[0] || cls.teacher?.id || cls.teacherId || undefined,
            teacherIds,
            category: cls.category ? (categoryMap.get(cls.category) || cls.category) : "General",
            categoryId: cls.categoryId || undefined,
            price: cls.price,
            capacity: cls.capacity,
            weeklyFrequency: cls.weeklyFrequency || 1,
            scheduledCount: scheduledByClass.get(cls.id) || 0,
            room: cls.roomId ? roomMap.get(cls.roomId) || "Sin aula" : "Sin aula",
            roomId: cls.roomId || undefined,
            status: cls.status,
            enrolled: 0,
          };
        });
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

  const handleSave = useCallback(async (data: Omit<ClassRecord, "id" | "enrolled"> & { discipline_id?: string; category_id?: string; teacher_id?: string; teacher_ids?: string[]; room_id?: string }): Promise<boolean> => {
    try {
      if (editingClass) {
        // Update existing
        const result = await updateClass(editingClass.id, {
          name: data.name,
          discipline_id: data.discipline_id || undefined,
          category_id: data.category_id || undefined,
          teacher_id: data.teacher_id,
          teacher_ids: data.teacher_ids,
          room_id: data.room_id,
          price: data.price,
          capacity: data.capacity,
          weeklyFrequency: data.weeklyFrequency || 1,
          status: data.status,
        });
        if (result) {
          setClasses((prev) =>
            prev.map((c) => (
              c.id === editingClass.id
                ? {
                    ...c,
                    ...data,
                    disciplineId: data.discipline_id || undefined,
                    categoryId: data.category_id || undefined,
                    roomId: data.room_id || undefined,
                    teacherId: data.teacher_id || undefined,
                    teacherIds: data.teacher_ids || [],
                    teacher: data.teacher?.trim() ? data.teacher : "Sin asignar",
                  }
                : c
            ))
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
          discipline_id: data.discipline_id || undefined,
          category_id: data.category_id || undefined,
          teacher_id: data.teacher_id,
          teacher_ids: data.teacher_ids,
          room_id: data.room_id,
          price: data.price,
          capacity: data.capacity,
          weeklyFrequency: data.weeklyFrequency || 1,
          status: data.status,
        });
        if (result) {
          const newClass: ClassRecord = {
            ...data,
            id: result.id,
            disciplineId: data.discipline_id || undefined,
            categoryId: data.category_id || undefined,
            roomId: data.room_id || undefined,
            teacherId: data.teacher_id || undefined,
            teacherIds: data.teacher_ids || [],
            teacher: data.teacher?.trim() ? data.teacher : "Sin asignar",
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
