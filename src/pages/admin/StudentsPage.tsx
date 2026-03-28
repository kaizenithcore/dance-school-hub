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
import { getSchoolSettings } from "@/lib/api/settings";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileUp, Plus, Rocket, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { planCatalog, type PlanType } from "@/lib/commercialCatalog";

type CapacityAlertLevel = "low" | "medium" | "high";

function getCapacityAlertMeta(remainingPercent: number, planType: PlanType): {
  level: CapacityAlertLevel;
  title: string;
  description: string;
} {
  const growthHint = planType === "starter"
    ? "Sube a Pro para ampliar capacidad y desbloquear automatizaciones clave."
    : "Activa bloques extra o revisa un upgrade para mantener margen operativo.";

  if (remainingPercent <= 5) {
    return {
      level: "high",
      title: "Capacidad critica: menos del 5% disponible",
      description: growthHint,
    };
  }

  if (remainingPercent <= 15) {
    return {
      level: "medium",
      title: "Capacidad muy baja: menos del 15% disponible",
      description: growthHint,
    };
  }

  return {
    level: "low",
    title: "Capacidad en alerta: menos del 25% disponible",
    description: growthHint,
  };
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState<PlanType>("starter");
  const [maxActiveStudents, setMaxActiveStudents] = useState<number>(0);
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
    payerType: data.payerType,
    payerName: data.payerName,
    payerEmail: data.payerEmail,
    payerPhone: data.payerPhone,
    preferredPaymentMethod: data.preferredPaymentMethod,
    accountNumber: data.accountNumber,
    classIds: (data.enrolledClasses || []).map((klass) => klass.id).filter(Boolean),
  });

  const loadCapacity = useCallback(async () => {
    try {
      const settings = await getSchoolSettings();
      const limits = (settings?.billing?.limits || {}) as Record<string, unknown>;
      const parsedMax = Number(limits.maxActiveStudents ?? 0);
      setMaxActiveStudents(parsedMax > 0 ? parsedMax : 0);
      const plan = settings?.billing?.planType;
      setPlanType(plan === "pro" || plan === "enterprise" ? plan : "starter");
    } catch (error) {
      console.error("Error loading capacity limits:", error);
      setMaxActiveStudents(0);
      setPlanType("starter");
    }
  }, []);

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
    void loadCapacity();
  }, [loadCapacity]);

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
      await loadCapacity();
      return true;
    } catch (error) {
      console.error("Error saving student:", error);
      const message = error instanceof Error ? error.message : "Error al guardar el alumno";
      toast.error(message);
      return false;
    }
  }, [editingStudent, loadCapacity, loadStudents]);

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
        await loadCapacity();
      } catch (error) {
        console.error("Error deleting student:", error);
        toast.error("Error al eliminar el alumno");
      }
    })();
  }, [deletingStudent, loadCapacity, loadStudents]);

  const activeStudents = students.filter((student) => student.status === "active").length;
  const effectiveMaxStudents = maxActiveStudents > 0 ? maxActiveStudents : Math.max(activeStudents, 1);
  const remainingStudents = Math.max(0, effectiveMaxStudents - activeStudents);
  const usedPercent = Math.min(100, (activeStudents / effectiveMaxStudents) * 100);
  const remainingPercent = Math.max(0, 100 - usedPercent);
  const shouldShowUpgradeBanner = maxActiveStudents > 0 && remainingPercent <= 25;
  const alertMeta = shouldShowUpgradeBanner ? getCapacityAlertMeta(remainingPercent, planType) : null;
  const upgradeBannerClassName =
    alertMeta?.level === "high"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : alertMeta?.level === "medium"
        ? "border-warning/40 bg-warning/10 text-warning"
        : "border-primary/30 bg-primary/5 text-primary";

  return (
    <PageContainer
      title="Alumnos"
      description="Gestiona los registros de alumnos"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/students/import")}>
            <FileUp className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Alumno
          </Button>
        </div>
      }
    >
      <section className="space-y-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Capacidad del plan</p>
              <p className="text-lg font-semibold text-foreground">
                {remainingStudents} alumnos restantes
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({activeStudents}/{effectiveMaxStudents} activos)
                </span>
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {Math.round(remainingPercent)}% disponible
            </Badge>
          </div>
          <Progress value={usedPercent} className="mt-3 h-2" />
        </div>

        {alertMeta ? (
          <Alert className={upgradeBannerClassName}>
            <Rocket className="h-4 w-4" />
            <AlertTitle>{alertMeta.title}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>
                {alertMeta.description} Te quedan {remainingStudents} plazas antes de llegar al limite actual.
              </span>
              <Button
                size="sm"
                variant={alertMeta.level === "high" ? "destructive" : "default"}
                onClick={() => navigate("/admin/settings")}
              >
                Mejorar plan
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      <StudentsTable
        students={loading ? [] : students}
        onViewProfile={handleViewProfile}
        onEdit={handleEdit}
        onManageClasses={handleManageClasses}
        onDelete={handleDelete}
      />

      <Alert className="border-primary/25 bg-primary/5">
        <ShoppingBag className="h-4 w-4" />
        <AlertTitle>{planType === "starter" ? "Escala a Pro para crecer sin fricciones" : "Amplia tu capacidad con bloques extra"}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {planType === "starter"
              ? `El plan Pro incluye hasta ${planCatalog.pro.limits.includedActiveStudents} alumnos activos y módulos avanzados.`
              : "Compra bloques de alumnos activos para seguir creciendo sin cambiar de plan base."}
          </span>
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/settings")}>{planType === "starter" ? "Ver plan Pro" : "Comprar bloques"}</Button>
        </AlertDescription>
      </Alert>

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
