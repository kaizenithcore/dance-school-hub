import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExamCandidate, ExamRecord, GradingCategory } from "@/lib/data/mockExams";
import { Badge } from "@/components/ui/badge";

interface GradingInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: ExamRecord;
  candidate: ExamCandidate | null;
  onSave: (candidateId: string, grades: Record<string, number>, finalGrade: number) => void;
}

export function GradingInterface({ open, onOpenChange, exam, candidate, onSave }: GradingInterfaceProps) {
  const [grades, setGrades] = useState<Record<string, number>>({});

  useEffect(() => {
    if (candidate) {
      setGrades({ ...candidate.grades });
    } else {
      setGrades({});
    }
  }, [candidate, open]);

  const finalGrade = useMemo(() => {
    let total = 0;
    let totalWeight = 0;
    for (const cat of exam.gradingCategories) {
      const grade = grades[cat.id];
      if (grade !== undefined && !isNaN(grade)) {
        total += grade * (cat.weight / 100);
        totalWeight += cat.weight;
      }
    }
    return totalWeight > 0 ? Math.round(total * 100) / 100 : 0;
  }, [grades, exam.gradingCategories]);

  const allFilled = exam.gradingCategories.every(
    (cat) => grades[cat.id] !== undefined && !isNaN(grades[cat.id])
  );

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Calificación</DialogTitle>
          <DialogDescription>
            Introduce las notas por categoría para calcular y guardar la calificación final del candidato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-semibold text-foreground">{candidate.studentName}</p>
            <p className="text-xs text-muted-foreground">{candidate.studentEmail}</p>
          </div>

          <div className="space-y-3">
            {exam.gradingCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-sm">{cat.name}</Label>
                  <p className="text-[10px] text-muted-foreground">Peso: {cat.weight}%</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={grades[cat.id] ?? ""}
                  onChange={(e) =>
                    setGrades((prev) => ({
                      ...prev,
                      [cat.id]: parseFloat(e.target.value),
                    }))
                  }
                  className="w-20 text-center"
                  placeholder="0-10"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-sm font-semibold text-foreground">Nota final</span>
            <Badge
              variant="outline"
              className={`text-base font-bold px-3 py-1 ${
                finalGrade >= 5 ? "bg-success/15 text-success border-success/20" : "bg-destructive/15 text-destructive border-destructive/20"
              }`}
            >
              {allFilled ? finalGrade.toFixed(2) : "—"}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (allFilled) onSave(candidate.id, grades, finalGrade);
            }}
            disabled={!allFilled}
          >
            Guardar calificación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
