import { useState, useCallback, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EnrollmentsTable } from "@/components/tables/EnrollmentsTable";
import { EnrollmentDetailDrawer } from "@/components/tables/EnrollmentDetailDrawer";
import { EnrollmentRecord, EnrollmentStatus } from "@/lib/data/mockEnrollments";
import { getEnrollments, updateEnrollmentStatus } from "@/lib/api/enrollments";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pending: "pendiente",
  confirmed: "aceptada",
  declined: "rechazada",
  cancelled: "cancelada",
};

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEnrollments();
      setEnrollments(data);
    } catch (error) {
      console.error("Error loading enrollments:", error);
      toast.error("Error al cargar inscripciones");
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const targetId = searchParams.get("id");
    const action = searchParams.get("action");

    if (!targetId || action !== "preview") {
      return;
    }

    const targetEnrollment = enrollments.find((enrollment) => enrollment.id === targetId);
    if (!targetEnrollment) {
      return;
    }

    handleViewDetail(targetEnrollment);
    setSearchParams({}, { replace: true });
  }, [loading, enrollments, searchParams, setSearchParams]);

  const handleViewDetail = (enrollment: EnrollmentRecord) => {
    setSelectedEnrollment(enrollment);
    setDrawerOpen(true);
  };

  const handleChangeStatus = useCallback((id: string, status: EnrollmentStatus) => {
    void (async () => {
      const updated = await updateEnrollmentStatus(id, status);
      if (!updated) {
        toast.error("No se pudo actualizar el estado de la inscripción");
        return;
      }

      setEnrollments((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: updated.status } : e))
      );
      setSelectedEnrollment((prev) => prev && prev.id === id ? { ...prev, status: updated.status } : prev);
      toast.success(`Inscripción marcada como ${STATUS_LABELS[updated.status]}`);
    })();
  }, []);

  return (
    <PageContainer
      title="Inscripciones"
      description="Revisa y gestiona las solicitudes de inscripción"
    >
      <EnrollmentsTable
        enrollments={enrollments}
        isLoading={loading}
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
