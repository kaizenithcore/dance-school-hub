import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModuleHelpShortcut } from "@/components/layout/ModuleHelpShortcut";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyCourseClone, getCloneJobs, runCloneDryRun, type CloneJob, type CourseCloneDryRun } from "@/lib/api/courseClone";
import { EmptyState } from "@/components/ui/empty-state";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { UpgradeFeatureAlert } from "@/components/billing/UpgradeFeatureAlert";
import { FeatureLockDialog } from "@/components/billing/FeatureLockDialog";

const CLONE_STATUS_LABELS: Record<CloneJob["status"], string> = {
  queued: "En cola",
  processing: "En proceso",
  completed: "Completada",
  failed: "Con error",
};

export default function CourseClonePage() {
  const { billing, planLabel, startUpgrade, loading: billingLoading } = useBillingEntitlements();
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [refreshingJobs, setRefreshingJobs] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [sourcePeriod, setSourcePeriod] = useState("");
  const [targetPeriod, setTargetPeriod] = useState("");
  const [dryRun, setDryRun] = useState<CourseCloneDryRun | null>(null);
  const [jobs, setJobs] = useState<CloneJob[]>([]);
  const cloneLocked = !billingLoading && !billing.features.courseClone;
  const normalizedSourcePeriod = sourcePeriod.trim();
  const normalizedTargetPeriod = targetPeriod.trim();
  const hasFreshDryRun =
    Boolean(dryRun) &&
    dryRun?.sourcePeriod === normalizedSourcePeriod &&
    dryRun?.targetPeriod === normalizedTargetPeriod;
  const completedJobsCount = jobs.filter((job) => job.status === "completed").length;
  const pendingJobsCount = jobs.filter((job) => job.status === "queued" || job.status === "processing").length;

  const loadJobs = async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;

    if (background) {
      setRefreshingJobs(true);
    } else {
      setLoadingJobs(true);
    }

    try {
      setJobsError(null);
      const data = await getCloneJobs();
      setJobs(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los trabajos de clonado";
      setJobsError(message);
      toast.error(message);
      setJobs([]);
    } finally {
      if (background) {
        setRefreshingJobs(false);
      } else {
        setLoadingJobs(false);
      }
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const handleDryRun = async () => {
    if (cloneLocked) {
      setLockOpen(true);
      return;
    }

    if (!normalizedSourcePeriod || !normalizedTargetPeriod) {
      toast.error("Debes indicar periodo origen y destino");
      return;
    }

    setProcessing(true);
    try {
      const result = await runCloneDryRun({ sourcePeriod: normalizedSourcePeriod, targetPeriod: normalizedTargetPeriod });
      setDryRun(result);
      toast.success("Simulación completada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo ejecutar la simulación");
      setDryRun(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyClone = async () => {
    if (cloneLocked) {
      setLockOpen(true);
      return;
    }

    if (!normalizedSourcePeriod || !normalizedTargetPeriod) {
      toast.error("Debes indicar periodo origen y destino");
      return;
    }

    if (!hasFreshDryRun) {
      toast.error("Debes ejecutar una simulación actualizada antes de confirmar la duplicación");
      return;
    }

    setProcessing(true);
    try {
      const result = await applyCourseClone({ sourcePeriod: normalizedSourcePeriod, targetPeriod: normalizedTargetPeriod });
      toast.success(`Duplicación finalizada (referencia ${result.jobId})`);
      await loadJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo ejecutar la duplicación");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PageContainer
      title="Plantillas"
      description="Duplica estructura académica entre periodos sin rehacer trabajo"
      actions={
        <>
          <ModuleHelpShortcut module="course-clone" />
          <Button variant="outline" onClick={() => void loadJobs({ background: true })} disabled={refreshingJobs || processing}>
            {refreshingJobs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Recargar</span>
          </Button>
        </>
      }
    >
      {cloneLocked ? (
        <UpgradeFeatureAlert
          title="Clonado de cursos disponible en plan Pro"
          description={`Tu plan actual (${planLabel}) no permite duplicar cursos entre periodos. Mejora el plan para activarlo.`}
          onUpgrade={() => void startUpgrade("courseClone")}
        />
      ) : null}

      <section className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">El sistema que tu academia se merece</p>
        <p className="mt-1 text-xs text-muted-foreground">Usa plantillas de periodo para lanzar el siguiente ciclo con menos fricción.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Ejecuciones totales</p>
            <p className="text-lg font-semibold text-foreground">{jobs.length}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Completadas</p>
            <p className="text-lg font-semibold text-foreground">{completedJobsCount}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Pendientes</p>
            <p className="text-lg font-semibold text-foreground">{pendingJobsCount}</p>
          </div>
        </div>
      </section>

      <div className={cloneLocked ? "pointer-events-none opacity-70 blur-[1px]" : ""}>

      <Card>
        <CardHeader>
          <CardTitle>Preparar duplicación</CardTitle>
          <CardDescription>Primero ejecuta una simulación para validar el resultado y luego confirma.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Periodo origen</Label>
            <Input
              value={sourcePeriod}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSourcePeriod(nextValue);
                if (dryRun && (dryRun.sourcePeriod !== nextValue.trim() || dryRun.targetPeriod !== normalizedTargetPeriod)) {
                  setDryRun(null);
                }
              }}
              placeholder="2026-03"
            />
          </div>
          <div className="space-y-2">
            <Label>Periodo destino</Label>
            <Input
              value={targetPeriod}
              onChange={(event) => {
                const nextValue = event.target.value;
                setTargetPeriod(nextValue);
                if (dryRun && (dryRun.targetPeriod !== nextValue.trim() || dryRun.sourcePeriod !== normalizedSourcePeriod)) {
                  setDryRun(null);
                }
              }}
              placeholder="2026-04"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={handleDryRun} disabled={processing}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simular
            </Button>
            <Button
              onClick={handleApplyClone}
              disabled={processing || !hasFreshDryRun}
              title={!hasFreshDryRun ? "Ejecuta una simulación con los periodos actuales antes de confirmar" : undefined}
            >
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar duplicación
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultado de la simulación</CardTitle>
          <CardDescription>Vista previa del impacto antes de confirmar cambios.</CardDescription>
        </CardHeader>
        <CardContent>
          {!dryRun ? (
            <EmptyState
              title="Sin simulación reciente"
              description="Lanza una simulación para validar clases y horarios antes de duplicar."
              actionLabel="Simular"
              onAction={() => void handleDryRun()}
            />
          ) : (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Periodo:</span> {dryRun.sourcePeriod} a {dryRun.targetPeriod}</p>
              <p><span className="font-medium">Clases origen:</span> {dryRun.sourceClassCount}</p>
              <p><span className="font-medium">Horarios origen:</span> {dryRun.sourceScheduleCount}</p>
              <p><span className="font-medium">Muestra:</span> {dryRun.sampleClassNames.join(", ") || "Sin datos"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de ejecuciones</CardTitle>
          <CardDescription>{jobs.length === 0 ? "Sin ejecuciones aún" : `${jobs.length} ejecución(es)`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingJobs && jobs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : jobsError ? (
            <EmptyState
              type="error"
              title="No se pudo recuperar el historial"
              description={jobsError}
              actionLabel="Reintentar"
              onAction={() => void loadJobs()}
            />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="Sin ejecuciones registradas"
              description="Cuando confirmes una duplicación, verás aquí el historial de trabajos."
              actionLabel="Actualizar historial"
              onAction={() => void loadJobs({ background: true })}
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-lg border p-3">
                  <p className="font-medium">{job.sourcePeriod} a {job.targetPeriod}</p>
                  <p className="text-sm text-muted-foreground">Estado: {CLONE_STATUS_LABELS[job.status]} · {new Date(job.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FeatureLockDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title="Clonado de cursos bloqueado"
        description="Esta función está incluida en planes superiores. Puedes actualizar tu plan para usar simulación y duplicación automática."
        onUpgrade={() => void startUpgrade("courseClone")}
      />
    </PageContainer>
  );
}
