import { useState, useCallback, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StudentsTable } from "@/components/tables/StudentsTable";
import { StudentProfileDrawer } from "@/components/tables/StudentProfileDrawer";
import { StudentFormModal } from "@/components/tables/StudentFormModal";
import { DeleteStudentModal } from "@/components/tables/DeleteStudentModal";
import { StudentClassesModal } from "@/components/tables/StudentClassesModal";
import { StudentRecord } from "@/lib/data/mockStudents";
import {
  createStudent,
  deleteStudent,
  getStudents,
  updateStudent,
  type SaveStudentRequest,
} from "@/lib/api/students";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentRecord | null>(null);
  const [classesModalOpen, setClassesModalOpen] = useState(false);
  const [classesStudent, setClassesStudent] = useState<StudentRecord | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const mapToSavePayload = (data: Omit<StudentRecord, "id">): SaveStudentRequest => ({
    name: data.name,
    email: data.email,
    phone: data.phone,
    birthdate: data.birthdate,
    status: data.status,
    joinDate: data.joinDate,
    guardian: data.guardian,
    notes: data.notes,
    paymentType: data.paymentType,
    classIds: (data.enrolledClasses || []).map((klass) => klass.id).filter(Boolean),
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Error al cargar alumnos");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const targetId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!targetId || !action) {
      return;
    }

    const targetStudent = students.find((student) => student.id === targetId);
    if (!targetStudent) {
      return;
    }

    if (action === "preview") {
      handleViewProfile(targetStudent);
    } else if (action === "edit") {
      handleEdit(targetStudent);
    } else if (action === "delete") {
      handleDelete(targetStudent);
    }

    setSearchParams({}, { replace: true });
  }, [loading, students, searchParams, setSearchParams]);

  const handleViewProfile = (student: StudentRecord) => {
    setSelectedStudent(student);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setEditingStudent(null);
    setFormOpen(true);
  };

  const handleEdit = (student: StudentRecord) => {
    setEditingStudent(student);
    setFormOpen(true);
  };

  const handleDelete = (student: StudentRecord) => {
    setDeletingStudent(student);
    setDeleteOpen(true);
  };

  const handleManageClasses = (student: StudentRecord) => {
    setClassesStudent(student);
    setClassesModalOpen(true);
  };

  const handleSave = useCallback(async (data: Omit<StudentRecord, "id">): Promise<boolean> => {
    const payload = mapToSavePayload(data);

    try {
      if (editingStudent) {
        const success = await updateStudent(editingStudent.id, payload);
        if (!success) {
          toast.error("No se pudo actualizar el alumno");
          return false;
        }
        toast.success("Alumno actualizado exitosamente");
      } else {
        const createdId = await createStudent(payload);
        if (!createdId) {
          toast.error("No se pudo crear el alumno");
          return false;
        }
        toast.success("Alumno creado exitosamente");
      }

      await loadStudents();
      return true;
    } catch (error) {
      console.error("Error saving student:", error);
      toast.error("Error al guardar el alumno");
      return false;
    }
  }, [editingStudent, loadStudents]);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingStudent) {
      return;
    }

    void (async () => {
      try {
        const success = await deleteStudent(deletingStudent.id);
        if (!success) {
          toast.error("No se pudo eliminar el alumno");
          return;
        }

        toast.success("Alumno eliminado");
        await loadStudents();
      } catch (error) {
        console.error("Error deleting student:", error);
        toast.error("Error al eliminar el alumno");
      }
    })();
  }, [deletingStudent, loadStudents]);

  return (
    <PageContainer
      title="Alumnos"
      description="Gestiona los registros de alumnos"
      actions={
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo Alumno
        </Button>
      }
    >
      <StudentsTable
        students={loading ? [] : students}
        onViewProfile={handleViewProfile}
        onEdit={handleEdit}
        onManageClasses={handleManageClasses}
        onDelete={handleDelete}
      />

      <StudentProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        student={selectedStudent}
      />

      <StudentFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        student={editingStudent}
        onSave={handleSave}
      />

      <DeleteStudentModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        student={deletingStudent}
        onConfirm={handleConfirmDelete}
      />

      <StudentClassesModal
        open={classesModalOpen}
        onOpenChange={setClassesModalOpen}
        student={classesStudent}
        students={students}
        onUpdated={loadStudents}
      />
    </PageContainer>
  );
}
