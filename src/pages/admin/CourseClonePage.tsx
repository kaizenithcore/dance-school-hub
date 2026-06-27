import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { previewCourseClone, executeCourseClone, type ClonePreview, type CloneResult } from "@/lib/api/courseClone";
import { useAcademicYearContext } from "@/contexts/AcademicYearContext";

export default function CourseClonePage() {
  const { academicYears, currentYearId, reload } = useAcademicYearContext();
  const [sourceYearId, setSourceYearId] = useState<string>("");
  const [targetYearId, setTargetYearId] = useState<string>("");
  const [preview, setPreview] = useState<ClonePreview | null>(null);
  const [result, setResult] = useState<CloneResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [cloning, setCloning] = useState(false);

  // Auto-select current year as source on load
  useEffect(() => {
    if (currentYearId && !sourceYearId) setSourceYearId(currentYearId);
  }, [currentYearId, sourceYearId]);

  // Reset preview when years change
  useEffect(() => { setPreview(null); setResult(null); }, [sourceYearId, targetYearId]);

  const canPreview = !!sourceYearId && !!targetYearId && sourceYearId !== targetYearId;
  const canClone = canPreview && !!preview && !result;

  const handlePreview = async () => {
    if (!canPreview) return;
    setPreviewing(true);
    try {
      const p = await previewCourseClone(sourceYearId, targetYearId);
      setPreview(p);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al previsualizar");
    } finally { setPreviewing(false); }
  };

  const handleClone = async () => {
    if (!canClone) return;
    setCloning(true);
    try {
      const r = await executeCourseClone(sourceYearId, targetYearId);
      setResult(r);
      toast.success(`${r.classesCloned} clase(s) y ${r.schedulesCloned} horario(s) copiados al nuevo curso`);
      // Refresh academic year context so data reloads
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al clonar el curso");
    } finally { setCloning(false); }
  };

  const sourceName = academicYears.find((y) => y.id === sourceYearId)?.displayName ?? "—";
  const targetName = academicYears.find((y) => y.id === targetYearId)?.displayName ?? "—";

  return (
    <PageContainer title="Clonar curso">
      <div className="max-w-xl space-y-6">
        {/* Explanation */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">¿Para qué sirve esto?</h2>
          <p className="text-sm text-muted-foreground">
            Duplica todas las clases y horarios de un curso académico al siguiente con un clic.
            Los alumnos y pagos no se copian — solo la estructura de clases y horarios.
            Tras clonar, revisa y ajusta los horarios del nuevo curso en{" "}
            <strong>/admin/schedule</strong>.
          </p>
        </div>

        {/* Selectors */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Curso origen</Label>
              <Select value={sourceYearId} onValueChange={setSourceYearId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecciona el curso a copiar" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Curso destino</Label>
              <Select value={targetYearId} onValueChange={setTargetYearId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Curso donde copiar" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears
                    .filter((y) => y.id !== sourceYearId)
                    .map((y) => (
                      <SelectItem key={y.id} value={y.id}>{y.displayName}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sourceYearId && targetYearId && sourceYearId !== targetYearId && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{sourceName}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">{targetName}</span>
            </div>
          )}

          {sourceYearId === targetYearId && sourceYearId && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> El curso origen y destino no pueden ser el mismo.
            </p>
          )}
        </div>

        {/* Preview */}
        {preview && !result && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Vista previa de la clonación</p>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-md border border-border bg-card px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Clases a copiar: </span>
                <span className="font-semibold">{preview.classCount}</span>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Horarios a copiar: </span>
                <span className="font-semibold">{preview.scheduleCount}</span>
              </div>
            </div>
            {preview.sampleNames.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Ejemplo de clases:</p>
                <div className="flex flex-wrap gap-1">
                  {preview.sampleNames.map((n) => (
                    <Badge key={n} variant="outline" className="text-[10px]">{n}</Badge>
                  ))}
                  {preview.classCount > preview.sampleNames.length && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      +{preview.classCount - preview.sampleNames.length} más
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {preview.classCount === 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                El curso origen no tiene clases con año académico asignado. Asegúrate de haber ejecutado la migración de base de datos.
              </p>
            )}
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-semibold">Clonación completada</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Se copiaron <strong>{result.classesCloned} clase(s)</strong> y{" "}
              <strong>{result.schedulesCloned} horario(s)</strong> al curso {targetName}.
            </p>
            <p className="text-xs text-muted-foreground">
              Cambia al curso destino en el selector del header y revisa los horarios en{" "}
              <a href="/admin/schedule" className="underline hover:text-foreground">Horario semanal</a>.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void handlePreview()}
            disabled={!canPreview || previewing || cloning}
            className={cn(!canPreview && "opacity-50")}
          >
            {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Vista previa
          </Button>
          <Button
            onClick={() => void handleClone()}
            disabled={!canClone || cloning}
          >
            {cloning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
            Clonar curso
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
