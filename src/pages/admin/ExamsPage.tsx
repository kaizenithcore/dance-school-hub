import { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ExamCard } from "@/components/exams/ExamCard";
import { ExamFormModal } from "@/components/exams/ExamFormModal";
import { ExamOnboardingChecklist } from "@/components/exams/ExamOnboardingChecklist";
import { CandidatesTable } from "@/components/exams/CandidatesTable";
import { GradingInterface } from "@/components/exams/GradingInterface";
import { CertificatePreview } from "@/components/exams/CertificatePreview";
import {
  ExamRecord, ExamCandidate, MOCK_EXAMS, MOCK_CANDIDATES,
} from "@/lib/data/mockExams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { UpgradeFeatureAlert } from "@/components/billing/UpgradeFeatureAlert";
import { FeatureLockDialog } from "@/components/billing/FeatureLockDialog";

type View = "list" | "candidates" | "grading";
const EXAMS_ONBOARDING_DISMISSED_KEY = "nexa:certifier:onboarding-dismissed";

function toIsoDayWithOffset(offsetDays: number): string {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays);
  return target.toISOString().slice(0, 10);
}

export default function ExamsPage() {
  const { billing, planLabel, startUpgrade, loading: billingLoading } = useBillingEntitlements();
  const [exams, setExams] = useState<ExamRecord[]>(MOCK_EXAMS);
  const [candidates, setCandidates] = useState<ExamCandidate[]>(MOCK_CANDIDATES);
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamRecord | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);
  const [gradingCandidate, setGradingCandidate] = useState<ExamCandidate | null>(null);
  const [gradingOpen, setGradingOpen] = useState(false);
  const [certCandidate, setCertCandidate] = useState<ExamCandidate | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [guidedInitialValues, setGuidedInitialValues] = useState<Partial<Omit<ExamRecord, "id" | "candidateCount">> | undefined>(undefined);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const examsLocked = !billingLoading && !billing.features.examSuite;

  useEffect(() => {
    const dismissed = window.localStorage.getItem(EXAMS_ONBOARDING_DISMISSED_KEY);
    setOnboardingDismissed(dismissed === "1");
  }, []);

  const filteredExams = exams.filter((e) => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.discipline.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreateExam = () => {
    if (examsLocked) {
      setLockOpen(true);
      return;
    }

    setEditingExam(null);
    setGuidedInitialValues(undefined);
    setFormOpen(true);
  };

  const handleCreateGuidedExam = () => {
    if (examsLocked) {
      setLockOpen(true);
      return;
    }

    setEditingExam(null);
    setGuidedInitialValues({
      name: "Examen Inicial",
      discipline: "Danza",
      level: "Nivel 1",
      category: "Certificación interna",
      examDate: toIsoDayWithOffset(21),
      registrationOpenDate: toIsoDayWithOffset(0),
      registrationCloseDate: toIsoDayWithOffset(14),
      status: "registration_open",
      maxCandidates: 30,
      gradingCategories: [
        { id: crypto.randomUUID(), name: "Técnica", weight: 40 },
        { id: crypto.randomUUID(), name: "Musicalidad", weight: 30 },
        { id: crypto.randomUUID(), name: "Expresión", weight: 30 },
      ],
    });
    setFormOpen(true);
    toast.info("Plantilla cargada. Solo revisa y publica tu primer examen.");
  };

  const handleEditExam = (exam: ExamRecord) => {
    if (examsLocked) {
      setLockOpen(true);
      return;
    }

    setEditingExam(exam);
    setFormOpen(true);
  };

  const handleSaveExam = (data: Omit<ExamRecord, "id" | "candidateCount">) => {
    if (editingExam) {
      setExams((prev) =>
        prev.map((e) => (e.id === editingExam.id ? { ...e, ...data } : e))
      );
      toast.success("Examen actualizado");
    } else {
      const newExam: ExamRecord = { ...data, id: crypto.randomUUID(), candidateCount: 0 };
      setExams((prev) => [...prev, newExam]);
      toast.success("Examen creado");
    }

    setGuidedInitialValues(undefined);
  };

  const handleDismissOnboarding = () => {
    window.localStorage.setItem(EXAMS_ONBOARDING_DISMISSED_KEY, "1");
    setOnboardingDismissed(true);
  };

  const handleOpenCandidatesFromOnboarding = () => {
    const firstExam = exams[0] || null;
    if (!firstExam) {
      toast.info("Primero crea tu examen guiado para continuar.");
      return;
    }

    setSelectedExam(firstExam);
    setView("candidates");
  };

  const onboardingSteps = [
    {
      id: "create_exam",
      title: "Crea tu primera convocatoria",
      description: "Define disciplina, fechas y criterios con una plantilla guiada.",
      completed: exams.length > 0,
    },
    {
      id: "open_enrollment",
      title: "Abre inscripción",
      description: "Publica la convocatoria con estado Registro abierto.",
      completed: exams.some((exam) => exam.status === "registration_open" || exam.status === "closed" || exam.status === "grading" || exam.status === "finished"),
    },
    {
      id: "register_candidates",
      title: "Registra candidatos",
      description: "Carga aspirantes y valida su estado para evaluación.",
      completed: candidates.length > 0,
    },
    {
      id: "grade_and_certificate",
      title: "Califica y genera certificados",
      description: "Completa notas finales y emite certificados en un clic.",
      completed: candidates.some((candidate) => candidate.status === "graded" || candidate.status === "certified"),
    },
  ];

  const onboardingVisible = !examsLocked && !onboardingDismissed;

  const handleViewCandidates = (exam: ExamRecord) => {
    setSelectedExam(exam);
    setView("candidates");
  };

  const handleOpenGradingExam = (exam: ExamRecord) => {
    setSelectedExam(exam);
    setView("candidates");
  };

  const handleOpenGradingCandidate = (candidate: ExamCandidate) => {
    setGradingCandidate(candidate);
    setGradingOpen(true);
  };

  const handleSaveGrade = (candidateId: string, grades: Record<string, number>, finalGrade: number) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId ? { ...c, grades, finalGrade, status: "graded" as const } : c
      )
    );
    setGradingOpen(false);
    toast.success("Calificación guardada");
  };

  const handleGenerateCertificate = (candidate: ExamCandidate) => {
    setCertCandidate(candidate);
    setCertOpen(true);
  };

  const handleGenerateAllCertificates = () => {
    if (!selectedExam) return;
    const examCandidates = candidates.filter((c) => c.examId === selectedExam.id && c.status === "graded");
    setCandidates((prev) =>
      prev.map((c) =>
        c.examId === selectedExam.id && c.status === "graded"
          ? { ...c, status: "certified" as const, certificateGenerated: true }
          : c
      )
    );
    toast.success(`${examCandidates.length} certificados generados`);
  };

  const handleOpenCertificates = (exam: ExamRecord) => {
    setSelectedExam(exam);
    setView("candidates");
  };

  const examCandidates = selectedExam
    ? candidates.filter((c) => c.examId === selectedExam.id)
    : [];

  if (view === "candidates" && selectedExam) {
    return (
      <PageContainer title="Exámenes" description="Gestión de exámenes, candidatos y certificados">
        <CandidatesTable
          exam={selectedExam}
          candidates={examCandidates}
          onBack={() => {
            setView("list");
            setSelectedExam(null);
          }}
          onOpenGrading={handleOpenGradingCandidate}
          onGenerateCertificate={handleGenerateCertificate}
          onGenerateAllCertificates={handleGenerateAllCertificates}
        />

        <GradingInterface
          open={gradingOpen}
          onOpenChange={setGradingOpen}
          exam={selectedExam}
          candidate={gradingCandidate}
          onSave={handleSaveGrade}
        />

        <CertificatePreview
          open={certOpen}
          onOpenChange={setCertOpen}
          exam={selectedExam}
          candidate={certCandidate}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Exámenes" description="Gestión de exámenes, candidatos y certificados">
      {examsLocked ? (
        <UpgradeFeatureAlert
          title="ExamSuite no está activo en tu plan"
          description={`El módulo de exámenes está bloqueado para el plan ${planLabel}. Mejora a Pro para gestionar candidatos, calificaciones y certificados.`}
          onUpgrade={() => void startUpgrade("examSuite")}
        />
      ) : null}

      {onboardingVisible ? (
        <div className="mb-6">
          <ExamOnboardingChecklist
            steps={onboardingSteps}
            onStartGuidedCreate={handleCreateGuidedExam}
            onOpenCandidates={handleOpenCandidatesFromOnboarding}
            onDismiss={handleDismissOnboarding}
          />
        </div>
      ) : null}

      <div className={examsLocked ? "pointer-events-none opacity-70 blur-[1px]" : ""}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar examen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="registration_open">Registro abierto</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
            <SelectItem value="grading">Evaluando</SelectItem>
            <SelectItem value="finished">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleCreateExam}>
          <Plus className="h-4 w-4 mr-1.5" />
          Crear examen
        </Button>
      </div>

      {filteredExams.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Sin exámenes"
          description="Crea tu primer examen para empezar a gestionar candidatos y certificados."
          actionLabel="Crear examen"
          onAction={handleCreateExam}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onEdit={handleEditExam}
              onViewCandidates={handleViewCandidates}
              onOpenGrading={handleOpenGradingExam}
              onOpenCertificates={handleOpenCertificates}
            />
          ))}
        </div>
      )}

      <ExamFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        exam={editingExam}
        initialValues={editingExam ? undefined : guidedInitialValues}
        onSave={handleSaveExam}
      />
      </div>

      <FeatureLockDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title="ExamSuite disponible en plan Pro"
        description="Para crear y gestionar exámenes necesitas activar el módulo ExamSuite en un plan superior."
        onUpgrade={() => void startUpgrade("examSuite")}
      />
    </PageContainer>
  );
}
