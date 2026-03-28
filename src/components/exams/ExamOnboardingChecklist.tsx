import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface ExamOnboardingChecklistProps {
  steps: OnboardingStep[];
  onStartGuidedCreate: () => void;
  onOpenCandidates: () => void;
  onDismiss: () => void;
}

function getProgress(steps: OnboardingStep[]) {
  const done = steps.filter((step) => step.completed).length;
  const total = steps.length;
  return {
    done,
    total,
    percentage: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function ExamOnboardingChecklist({
  steps,
  onStartGuidedCreate,
  onOpenCandidates,
  onDismiss,
}: ExamOnboardingChecklistProps) {
  const progress = getProgress(steps);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Onboarding Certifier
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Completa este flujo para tener tu primer examen operativo sin fricción.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progreso de activación</span>
          <span>{progress.done}/{progress.total} · {progress.percentage}%</span>
        </div>

        <div className="mb-5 h-2 w-full rounded-full bg-primary/15">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2.5">
              {step.completed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" onClick={onStartGuidedCreate}>Crear examen guiado</Button>
          <Button size="sm" variant="outline" onClick={onOpenCandidates}>Abrir candidatos</Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>Ocultar onboarding</Button>
        </div>
      </CardContent>
    </Card>
  );
}
