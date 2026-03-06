import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StudentsTable } from "@/components/tables/StudentsTable";
import { StudentProfileDrawer } from "@/components/tables/StudentProfileDrawer";
import { StudentRecord, MOCK_STUDENTS } from "@/lib/data/mockStudents";

export default function StudentsPage() {
  const [students] = useState<StudentRecord[]>(MOCK_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleViewProfile = (student: StudentRecord) => {
    setSelectedStudent(student);
    setDrawerOpen(true);
  };

  return (
    <PageContainer
      title="Alumnos"
      description="Gestiona los registros de alumnos"
    >
      <StudentsTable
        students={students}
        onViewProfile={handleViewProfile}
      />

      <StudentProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        student={selectedStudent}
      />
    </PageContainer>
  );
}
