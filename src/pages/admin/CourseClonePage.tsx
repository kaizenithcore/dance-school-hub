import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyCourseClone, getCloneJobs, runCloneDryRun, type CloneJob, type CourseCloneDryRun } from "@/lib/api/courseClone";
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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [sourcePeriod, setSourcePeriod] = useState("");
  const [targetPeriod, setTargetPeriod] = useState("");
  const [dryRun, setDryRun] = useState<CourseCloneDryRun | null>(null);
  const [jobs, setJobs] = useState<CloneJob[]>([]);
  const cloneLocked = !billingLoading && !billing.features.courseClone;

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await getCloneJobs();
      setJobs(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los trabajos de clonado");
      setJobs([]);
    } finally {
      setLoading(false);
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

    if (!sourcePeriod || !targetPeriod) {
      toast.error("Debes indicar periodo origen y destino");
      return;
    }

    setProcessing(true);
    try {
      const result = await runCloneDryRun({ sourcePeriod, targetPeriod });
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

    if (!sourcePeriod || !targetPeriod) {
      toast.error("Debes indicar periodo origen y destino");
      return;
    }

    setProcessing(true);
    try {
      const result = await applyCourseClone({ sourcePeriod, targetPeriod });
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
      title="Duplicar curso entre periodos"
      description="Copia clases y horarios del periodo actual al siguiente"
      actions={
        <Button variant="outline" onClick={() => void loadJobs()} disabled={loading || processing}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Recargar</span>
        </Button>
      }
    >
      {cloneLocked ? (
        <UpgradeFeatureAlert
          title="Clonado de cursos disponible en plan Pro"
          description={`Tu plan actual (${planLabel}) no permite duplicar cursos entre periodos. Mejora el plan para activarlo.`}
          onUpgrade={() => void startUpgrade("courseClone")}
        />
      ) : null}

      <div className={cloneLocked ? "pointer-events-none opacity-70 blur-[1px]" : ""}>

      <Card>
        <CardHeader>
          <CardTitle>Preparar duplicación</CardTitle>
          <CardDescription>Primero ejecuta una simulación para validar el resultado y luego confirma.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Periodo origen</Label>
            <Input value={sourcePeriod} onChange={(event) => setSourcePeriod(event.target.value)} placeholder="2026-03" />
          </div>
          <div className="space-y-2">
            <Label>Periodo destino</Label>
            <Input value={targetPeriod} onChange={(event) => setTargetPeriod(event.target.value)} placeholder="2026-04" />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={handleDryRun} disabled={processing || loading}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simular
            </Button>
            <Button onClick={handleApplyClone} disabled={processing || loading}>
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
            <p className="text-sm text-muted-foreground">Ejecuta una simulación para ver resultados.</p>
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
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay ejecuciones registradas.</p>
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
