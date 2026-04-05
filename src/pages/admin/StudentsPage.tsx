import { useState, useCallback, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StudentsTable } from "@/components/tables/StudentsTable";
import { StudentProfileDrawer } from "@/components/tables/StudentProfileDrawer";
import { StudentFormModal } from "@/components/tables/StudentFormModal";
import { DeleteStudentModal } from "@/components/tables/DeleteStudentModal";
import { StudentClassesModal } from "@/components/tables/StudentClassesModal";
import { StudentCustomFieldsManager } from "@/components/tables/StudentCustomFieldsManager";
import { StudentRecord } from "@/lib/data/mockStudents";
import {
  createStudent,
  deleteStudent,
  getStudents,
  updateStudent,
  type SaveStudentRequest,
} from "@/lib/api/students";
import { getStudentFields, type SchoolStudentField } from "@/lib/api/studentFields";
import { getSchoolSettings } from "@/lib/api/settings";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { planCatalog, type PlanType } from "@/lib/commercialCatalog";

export default function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentFields, setStudentFields] = useState<SchoolStudentField[]>([]);
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
    address: data.address,
    locality: data.locality,
    identityDocumentType: data.identityDocumentType,
    identityDocumentNumber: data.identityDocumentNumber,
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
    extraData: data.extraData,
  });

  const loadStudentFields = useCallback(async () => {
    try {
      const fields = await getStudentFields();
      setStudentFields(fields);
    } catch (error) {
      console.error("Error loading student fields:", error);
      setStudentFields([]);
    }
  }, []);

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

  useEffect(() => { void loadStudents(); }, [loadStudents]);
  useEffect(() => { void loadCapacity(); }, [loadCapacity]);
  useEffect(() => { void loadStudentFields(); }, [loadStudentFields]);

  useEffect(() => {
    if (loading) return;
    const targetId = searchParams.get("id");
    const action = searchParams.get("action");
    if (!targetId || !action) return;
    const targetStudent = students.find((student) => student.id === targetId);
    if (!targetStudent) return;
    if (action === "preview") handleViewProfile(targetStudent);
    else if (action === "edit") handleEdit(targetStudent);
    else if (action === "delete") handleDelete(targetStudent);
    setSearchParams({}, { replace: true });
  }, [loading, students, searchParams, setSearchParams]);

  const handleViewProfile = (student: StudentRecord) => { setSelectedStudent(student); setDrawerOpen(true); };
  const handleCreate = () => { setEditingStudent(null); setFormOpen(true); };
  const handleEdit = (student: StudentRecord) => { setEditingStudent(student); setFormOpen(true); };
  const handleDelete = (student: StudentRecord) => { setDeletingStudent(student); setDeleteOpen(true); };
  const handleManageClasses = (student: StudentRecord) => { setClassesStudent(student); setClassesModalOpen(true); };

  const handleSave = useCallback(async (data: Omit<StudentRecord, "id">): Promise<boolean> => {
    const payload = mapToSavePayload(data);
    try {
      if (editingStudent) {
        const success = await updateStudent(editingStudent.id, payload);
        if (!success) { toast.error("No se pudo actualizar el alumno"); return false; }
        toast.success("Alumno actualizado");
      } else {
        const createdId = await createStudent(payload);
        if (!createdId) { toast.error("No se pudo crear el alumno"); return false; }
        toast.success("Alumno creado");
      }
      await loadStudents();
      await loadCapacity();
      return true;
    } catch (error) {
      console.error("Error saving student:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar");
      return false;
    }
  }, [editingStudent, loadCapacity, loadStudents]);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingStudent) return;
    void (async () => {
      try {
        const success = await deleteStudent(deletingStudent.id);
        if (!success) { toast.error("No se pudo eliminar el alumno"); return; }
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
  const shouldShowUpgrade = maxActiveStudents > 0 && remainingPercent <= 15;

  return (
    <PageContainer
      title="Alumnos"
      description={`${activeStudents} activos · ${remainingStudents} plazas disponibles`}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/students/import")}>
            <FileUp className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" /> Añadir
          </Button>
        </div>
      }
    >
      {/* Capacity bar */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            {activeStudents} / {effectiveMaxStudents} alumnos activos
          </p>
          <Badge variant="outline" className="text-xs">{Math.round(remainingPercent)}% libre</Badge>
        </div>
        <Progress value={usedPercent} className="h-1.5" />
        {shouldShowUpgrade && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {planType === "starter"
                ? `Pro incluye hasta ${planCatalog.pro.limits.includedActiveStudents} alumnos.`
                : "Activa bloques extra para seguir creciendo."}
            </p>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate("/admin/settings")}>
              {planType === "starter" ? "Ver Pro" : "Ampliar"}
            </Button>
          </div>
        )}
      </div>

      <StudentsTable
        students={students}
        customFields={studentFields}
        isLoading={loading}
        onViewProfile={handleViewProfile}
        onEdit={handleEdit}
        onManageClasses={handleManageClasses}
        onDelete={handleDelete}
      />

      <StudentCustomFieldsManager fields={studentFields} onReload={loadStudentFields} />

      <StudentProfileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} student={selectedStudent} customFields={studentFields} />
      <StudentFormModal open={formOpen} onOpenChange={setFormOpen} student={editingStudent} customFields={studentFields} onSave={handleSave} />
      <DeleteStudentModal open={deleteOpen} onOpenChange={setDeleteOpen} student={deletingStudent} onConfirm={handleConfirmDelete} />
      <StudentClassesModal open={classesModalOpen} onOpenChange={setClassesModalOpen} student={classesStudent} students={students} onUpdated={loadStudents} />
    </PageContainer>
  );
}
