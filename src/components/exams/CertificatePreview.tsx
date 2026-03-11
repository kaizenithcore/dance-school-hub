import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExamCandidate, ExamRecord } from "@/lib/data/mockExams";
import { Award, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface CertificatePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: ExamRecord;
  candidate: ExamCandidate | null;
}

export function CertificatePreview({ open, onOpenChange, exam, candidate }: CertificatePreviewProps) {
  if (!candidate) return null;

  const handleDownload = () => {
    toast.success("Certificado descargado (simulación)");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Vista previa del certificado
          </DialogTitle>
        </DialogHeader>

        <div className="border-2 border-primary/20 rounded-xl p-8 bg-gradient-to-br from-background to-accent/30 text-center space-y-4">
          <div className="text-xs text-muted-foreground uppercase tracking-widest">Certificado de aprobación</div>

          <div className="space-y-1">
            <p className="text-lg font-bold text-foreground">{`{{student_name}}`}</p>
            <p className="text-sm text-muted-foreground">→ {candidate.studentName}</p>
          </div>

          <p className="text-sm text-muted-foreground">ha completado satisfactoriamente el examen</p>

          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">{`{{exam_name}}`}</p>
            <p className="text-sm text-muted-foreground">→ {exam.name}</p>
          </div>

          <div className="flex items-center justify-center gap-8 pt-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Nota final</p>
              <p className="text-xl font-bold text-primary">{`{{final_grade}}`}</p>
              <p className="text-xs text-muted-foreground">→ {candidate.finalGrade?.toFixed(2) || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Fecha</p>
              <p className="text-sm font-medium text-foreground">{`{{exam_date}}`}</p>
              <p className="text-xs text-muted-foreground">
                → {format(new Date(exam.examDate), "d MMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">Variables disponibles:</p>
          <code className="block">{`{{student_name}}`} — Nombre del alumno</code>
          <code className="block">{`{{exam_name}}`} — Nombre del examen</code>
          <code className="block">{`{{final_grade}}`} — Nota final</code>
          <code className="block">{`{{exam_date}}`} — Fecha del examen</code>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Descargar certificado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
