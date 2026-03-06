import { useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EnrollmentsTable } from "@/components/tables/EnrollmentsTable";
import { EnrollmentDetailDrawer } from "@/components/tables/EnrollmentDetailDrawer";
import { EnrollmentRecord, EnrollmentStatus, MOCK_ENROLLMENTS } from "@/lib/data/mockEnrollments";
import { toast } from "sonner";

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pending: "pendiente",
  confirmed: "confirmada",
  declined: "rechazada",
  cancelled: "cancelada",
};

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>(MOCK_ENROLLMENTS);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleViewDetail = (enrollment: EnrollmentRecord) => {
    setSelectedEnrollment(enrollment);
    setDrawerOpen(true);
  };

  const handleChangeStatus = useCallback((id: string, status: EnrollmentStatus) => {
    setEnrollments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    );
    setSelectedEnrollment((prev) => prev && prev.id === id ? { ...prev, status } : prev);
    toast.success(`Inscripción marcada como ${STATUS_LABELS[status]}`);
  }, []);

  return (
    <PageContainer
      title="Inscripciones"
      description="Revisa y gestiona las solicitudes de inscripción"
    >
      <EnrollmentsTable
        enrollments={enrollments}
        onViewDetail={handleViewDetail}
      />

      <EnrollmentDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        enrollment={selectedEnrollment}
        onChangeStatus={handleChangeStatus}
      />
    </PageContainer>
  );
}
