import { useState, useCallback, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { TeachersTable } from "@/components/tables/TeachersTable";
import { TeacherProfileDrawer } from "@/components/tables/TeacherProfileDrawer";
import { TeacherFormModal } from "@/components/tables/TeacherFormModal";
import { DeleteTeacherModal } from "@/components/tables/DeleteTeacherModal";
import { AssignClassesModal } from "@/components/tables/AssignClassesModal";
import { Class, TeacherRecord } from "@/lib/data/mockTeachers";
import { createTeacher, deleteTeacher, getTeachers, updateTeacher } from "@/lib/api/teachers";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<TeacherRecord | null>(null);
  const [teacherWithClassesToEdit, setTeacherWithClassesToEdit] = useState<TeacherRecord | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Load teachers from API
  useEffect(() => {
    const loadTeachers = async () => {
      setLoading(true);
      try {
        const data = await getTeachers();
        const mappedTeachers: TeacherRecord[] = (data || []).map((teacher) => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email || "",
          phone: teacher.phone || "",
          bio: teacher.bio || "",
          specialties: [],
          assignedClasses: [],
          status: teacher.status,
          hireDate: new Date().toISOString().split("T")[0],
          salary: teacher.salary || 0,
        }));
        setTeachers(mappedTeachers);
      } catch (error) {
        console.error("Error loading teachers:", error);
        toast.error("Error al cargar profesores");
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };
    loadTeachers();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const targetId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!targetId || !action) {
      return;
    }

    const targetTeacher = teachers.find((teacher) => teacher.id === targetId);
    if (!targetTeacher) {
      return;
    }

    if (action === "preview") {
      handleViewProfile(targetTeacher);
    } else if (action === "edit") {
      handleEdit(targetTeacher);
    } else if (action === "delete") {
      handleDelete(targetTeacher);
    }

    setSearchParams({}, { replace: true });
  }, [loading, teachers, searchParams, setSearchParams]);

  const handleViewProfile = (teacher: TeacherRecord) => {
    setSelectedTeacher(teacher);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setEditingTeacher(null);
    setFormOpen(true);
  };

  const handleEdit = (teacher: TeacherRecord) => {
    setEditingTeacher(teacher);
    setFormOpen(true);
  };

  const handleEditClasses = (teacher: TeacherRecord) => {
    setTeacherWithClassesToEdit(teacher);
    setClassesOpen(true);
  };

  const handleDelete = (teacher: TeacherRecord) => {
    setDeletingTeacher(teacher);
    setDeleteOpen(true);
  };

  const handleSave = useCallback(async (data: Omit<TeacherRecord, "id">): Promise<boolean> => {
    try {
      if (editingTeacher) {
        const result = await updateTeacher(editingTeacher.id, {
          name: data.name,
          email: data.email?.trim() ? data.email.trim() : undefined,
          phone: data.phone?.trim() ? data.phone.trim() : undefined,
          bio: data.bio?.trim() ? data.bio.trim() : undefined,
          status: data.status,
          salary: data.salary,
        });
        if (result) {
          setTeachers((prev) =>
            prev.map((t) => (t.id === editingTeacher.id ? { ...t, ...data } : t))
          );
          toast.success("Profesor actualizado exitosamente");
          return true;
        }
        toast.error("No se pudo actualizar el profesor");
        return false;
      } else {
        const result = await createTeacher({
          name: data.name,
          email: data.email?.trim() ? data.email.trim() : undefined,
          phone: data.phone?.trim() ? data.phone.trim() : undefined,
          bio: data.bio?.trim() ? data.bio.trim() : undefined,
          status: data.status,
          salary: data.salary,
        });
        if (result) {
          const newTeacher: TeacherRecord = { 
            ...data, 
            id: result.id,
            specialties: [],
            assignedClasses: [],
            hireDate: data.hireDate || new Date().toISOString().split("T")[0],
            salary: data.salary || 0,
          };
          setTeachers((prev) => [newTeacher, ...prev]);
          toast.success("Profesor creado exitosamente");
          return true;
        }
        toast.error("No se pudo crear el profesor");
        return false;
      }
    } catch (error) {
      toast.error("Error al guardar el profesor");
      console.error(error);
      return false;
    }
  }, [editingTeacher]);

  const handleConfirmDelete = useCallback(async () => {
    if (deletingTeacher) {
      try {
        const success = await deleteTeacher(deletingTeacher.id);
        if (success) {
          setTeachers((prev) => prev.filter((t) => t.id !== deletingTeacher.id));
          toast.success("Profesor eliminado");
        }
      } catch (error) {
        toast.error("Error al eliminar el profesor");
        console.error(error);
      }
    }
  }, [deletingTeacher]);

  const handleSaveClasses = useCallback((classes: Class[]) => {
    if (teacherWithClassesToEdit) {
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherWithClassesToEdit.id
            ? { ...t, assignedClasses: classes }
            : t
        )
      );
      toast.success("Clases asignadas exitosamente");
    }
  }, [teacherWithClassesToEdit]);

  return (
    <PageContainer
      title="Profesores"
      description="Gestiona los profesores y sus clases asignadas"
      actions={
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo Profesor
        </Button>
      }
    >
      <TeachersTable
        teachers={teachers}
        onViewProfile={handleViewProfile}
        onEdit={handleEdit}
        onEditClasses={handleEditClasses}
        onDelete={handleDelete}
      />

      <TeacherProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        teacher={selectedTeacher}
      />

      <TeacherFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        teacher={editingTeacher}
        onSave={handleSave}
      />

      <DeleteTeacherModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        teacher={deletingTeacher}
        onConfirm={handleConfirmDelete}
      />

      <AssignClassesModal
        open={classesOpen}
        onOpenChange={setClassesOpen}
        teacher={teacherWithClassesToEdit}
        onSave={handleSaveClasses}
      />
    </PageContainer>
  );
}
