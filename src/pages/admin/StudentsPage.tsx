import { useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StudentsTable } from "@/components/tables/StudentsTable";
import { StudentProfileDrawer } from "@/components/tables/StudentProfileDrawer";
import { StudentFormModal } from "@/components/tables/StudentFormModal";
import { DeleteStudentModal } from "@/components/tables/DeleteStudentModal";
import { StudentRecord, MOCK_STUDENTS } from "@/lib/data/mockStudents";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>(MOCK_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentRecord | null>(null);

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

  const handleSave = useCallback((data: Omit<StudentRecord, "id">) => {
    if (editingStudent) {
      setStudents((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? { ...s, ...data } : s))
      );
      toast.success("Alumno actualizado exitosamente");
    } else {
      const newStudent: StudentRecord = { ...data, id: `s-${Date.now()}` };
      setStudents((prev) => [newStudent, ...prev]);
      toast.success("Alumno creado exitosamente");
    }
  }, [editingStudent]);

  const handleConfirmDelete = useCallback(() => {
    if (deletingStudent) {
      setStudents((prev) => prev.filter((s) => s.id !== deletingStudent.id));
      toast.success("Alumno eliminado");
    }
  }, [deletingStudent]);

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
        students={students}
        onViewProfile={handleViewProfile}
        onEdit={handleEdit}
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
    </PageContainer>
  );
}
