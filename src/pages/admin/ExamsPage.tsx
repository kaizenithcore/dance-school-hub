import { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModuleHelpShortcut } from "@/components/layout/ModuleHelpShortcut";
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
const EXAMS_STORAGE_KEY = "nexa:certifier:exams";
const CANDIDATES_STORAGE_KEY = "nexa:certifier:candidates";
const EXAMS_SEARCH_KEY = "nexa:certifier:search";
const EXAMS_STATUS_FILTER_KEY = "nexa:certifier:status-filter";
const EXAMS_SELECTED_EXAM_KEY = "nexa:certifier:selected-exam";

function readStoredArray<T>(storageKey: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

function toIsoDayWithOffset(offsetDays: number): string {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays);
  return target.toISOString().slice(0, 10);
}

function readStoredString(storageKey: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(storageKey) || "";
}

function persistArray<T>(storageKey: string, value: T[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export default function ExamsPage() {
  const { billing, planLabel, startUpgrade, loading: billingLoading } = useBillingEntitlements();
  const [exams, setExams] = useState<ExamRecord[]>(() => readStoredArray(EXAMS_STORAGE_KEY, MOCK_EXAMS));
  const [candidates, setCandidates] = useState<ExamCandidate[]>(() => readStoredArray(CANDIDATES_STORAGE_KEY, MOCK_CANDIDATES));
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState(() => readStoredString(EXAMS_SEARCH_KEY));
  const [statusFilter, setStatusFilter] = useState(() => {
    const stored = readStoredString(EXAMS_STATUS_FILTER_KEY);
    return stored || "all";
  });

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamRecord | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);
  const [gradingCandidate, setGradingCandidate] = useState<ExamCandidate | null>(null);
  const [gradingOpen, setGradingOpen] = useState(false);
  const [certCandidate, setCertCandidate] = useState<ExamCandidate | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [formModalKey, setFormModalKey] = useState(0);
  const [guidedInitialValues, setGuidedInitialValues] = useState<Partial<Omit<ExamRecord, "id" | "candidateCount">> | undefined>(undefined);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const examsLocked = !billingLoading && !billing.features.examSuite;

  const setExamsPersisted = (updater: (previous: ExamRecord[]) => ExamRecord[]) => {
    setExams((previous) => {
      const next = updater(previous);
      persistArray(EXAMS_STORAGE_KEY, next);
      return next;
    });
  };

  const setCandidatesPersisted = (updater: (previous: ExamCandidate[]) => ExamCandidate[]) => {
    setCandidates((previous) => {
      const next = updater(previous);
      persistArray(CANDIDATES_STORAGE_KEY, next);
      return next;
    });
  };

  const openExamForm = () => {
    // Close then reopen in the next frame so guided/default templates always rehydrate.
    setFormOpen(false);
    setFormModalKey((previous) => previous + 1);
    window.requestAnimationFrame(() => {
      setFormOpen(true);
    });
  };

  useEffect(() => {
    const dismissed = window.localStorage.getItem(EXAMS_ONBOARDING_DISMISSED_KEY);
    setOnboardingDismissed(dismissed === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EXAMS_SEARCH_KEY, search);
  }, [search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EXAMS_STATUS_FILTER_KEY, statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(candidates));
  }, [candidates]);

  useEffect(() => {
    const storedSelectedExam = readStoredString(EXAMS_SELECTED_EXAM_KEY);
    if (!storedSelectedExam || exams.length === 0) {
      return;
    }

    const exam = exams.find((item) => item.id === storedSelectedExam);
    if (!exam) {
      return;
    }

    setSelectedExam(exam);
    setView("candidates");
  }, [exams]);

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
    openExamForm();
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
    openExamForm();
    toast.info("Plantilla cargada. Solo revisa y publica tu primer examen.");
  };

  const handleEditExam = (exam: ExamRecord) => {
    if (examsLocked) {
      setLockOpen(true);
      return;
    }

    setEditingExam(exam);
    openExamForm();
  };

  const handleSaveExam = (data: Omit<ExamRecord, "id" | "candidateCount">) => {
    if (editingExam) {
      setExamsPersisted((prev) =>
        prev.map((e) => (e.id === editingExam.id ? { ...e, ...data } : e))
      );
      toast.success("Examen actualizado");
    } else {
      const newExam: ExamRecord = { ...data, id: crypto.randomUUID(), candidateCount: 0 };
      setExamsPersisted((prev) => [...prev, newExam]);
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
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EXAMS_SELECTED_EXAM_KEY, exam.id);
    }
  };

  const handleOpenGradingExam = (exam: ExamRecord) => {
    setSelectedExam(exam);
    setView("candidates");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EXAMS_SELECTED_EXAM_KEY, exam.id);
    }
  };

  const handleOpenGradingCandidate = (candidate: ExamCandidate) => {
    setGradingCandidate(candidate);
    setGradingOpen(true);
  };

  const handleSaveGrade = (candidateId: string, grades: Record<string, number>, finalGrade: number) => {
    setCandidatesPersisted((prev) =>
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
    setCandidatesPersisted((prev) =>
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
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EXAMS_SELECTED_EXAM_KEY, exam.id);
    }
  };

  const examCandidates = selectedExam
    ? candidates.filter((c) => c.examId === selectedExam.id)
    : [];
  const gradedCandidatesCount = candidates.filter((candidate) => candidate.status === "graded" || candidate.status === "certified").length;
  const openExamsCount = exams.filter((exam) => exam.status === "registration_open" || exam.status === "grading").length;

  if (view === "candidates" && selectedExam) {
    return (
      <PageContainer title="Exámenes" description="Gestión de candidatos, calificaciones y certificados">
        <CandidatesTable
          exam={selectedExam}
          candidates={examCandidates}
          onBack={() => {
            setView("list");
            setSelectedExam(null);
            if (typeof window !== "undefined") {
              window.localStorage.removeItem(EXAMS_SELECTED_EXAM_KEY);
            }
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
    <PageContainer
      title="Exámenes"
      description="Operativa de convocatorias con foco en evaluación y certificados"
      actions={<ModuleHelpShortcut module="exams" />}
    >
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

      <section className="mb-6 rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Todo conectado. Todo bajo control.</p>
        <p className="mt-1 text-xs text-muted-foreground">Gestiona convocatorias y certificación en un flujo claro y escalable.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Convocatorias</p>
            <p className="text-lg font-semibold text-foreground">{exams.length}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Activas</p>
            <p className="text-lg font-semibold text-foreground">{openExamsCount}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Candidatos evaluados</p>
            <p className="text-lg font-semibold text-foreground">{gradedCandidatesCount}</p>
          </div>
        </div>
      </section>

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
          title={exams.length === 0 ? "Sin exámenes" : "No hay resultados con los filtros actuales"}
          description={
            exams.length === 0
              ? "Crea tu primer examen para empezar a gestionar candidatos y certificados."
              : "Ajusta búsqueda o estado para recuperar resultados rápidamente."
          }
          actionLabel={exams.length === 0 ? "Crear examen guiado" : "Limpiar filtros"}
          onAction={exams.length === 0 ? handleCreateGuidedExam : () => {
            setSearch("");
            setStatusFilter("all");
          }}
          secondaryActionLabel={exams.length === 0 ? "Crear examen" : undefined}
          onSecondaryAction={exams.length === 0 ? handleCreateExam : undefined}
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
        key={formModalKey}
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
