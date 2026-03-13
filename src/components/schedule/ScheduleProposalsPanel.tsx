import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { applyScheduleProposal, generateScheduleProposals, type ScheduleProposal } from "@/lib/api/schedules";
import { toast } from "sonner";
import { Sparkles, Wand2 } from "lucide-react";

interface ScheduleProposalsPanelProps {
  onApplied?: () => void;
  onPreviewChange?: (proposal: ScheduleProposal | null) => void;
}

export function ScheduleProposalsPanel({ onApplied, onPreviewChange }: ScheduleProposalsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ScheduleProposal[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const result = await generateScheduleProposals();
      setProposals(result?.proposals || []);
      setGeneratedAt(result?.generatedAt || null);
      toast.success("Propuestas A/B/C generadas");
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron generar propuestas");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (proposal: ScheduleProposal) => {
    try {
      setApplyingId(proposal.id);
      const result = await applyScheduleProposal(proposal);
      if (!result) {
        toast.error("No se pudo aplicar la propuesta");
        return;
      }

      const errors = result.result.errors.length;
      if (errors > 0) {
        toast.warning(`Propuesta ${proposal.label} aplicada con ${errors} error(es)`);
      } else {
        toast.success(`Propuesta ${proposal.label} aplicada correctamente`);
      }

      onApplied?.();
    } catch (error) {
      console.error(error);
      toast.error("Error aplicando propuesta");
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Propuestas automáticas A/B/C
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Genera tres opciones de horario usando demanda, continuidad de profesor y balance de aulas.
          </p>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={loading}>
          <Wand2 className="h-4 w-4 mr-1" />
          {loading ? "Generando..." : "Generar"}
        </Button>
      </CardHeader>
      <CardContent>
        {generatedAt && (
          <p className="text-xs text-muted-foreground mb-3">
            Última generación: {new Date(generatedAt).toLocaleString("es-ES")}
          </p>
        )}

        {proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no se han generado propuestas.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {proposals.map((proposal) => {
              const ratio = `${proposal.summary.plannedSessions}/${proposal.summary.requestedSessions}`;
              return (
                <div
                  key={proposal.id}
                  className="rounded-lg border border-border p-3 bg-card"
                  onMouseEnter={() => onPreviewChange?.(proposal)}
                  onMouseLeave={() => onPreviewChange?.(null)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Propuesta {proposal.label}</h4>
                    <Badge variant={proposal.score >= 80 ? "default" : proposal.score >= 60 ? "secondary" : "outline"}>
                      Score {proposal.score}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{proposal.strategy}</p>
                  <div className="space-y-1 text-xs mb-3">
                    <p>Sesiones planificadas: {ratio}</p>
                    <p>Sin ubicar: {proposal.summary.unplannedSessions}</p>
                    <p>Nuevos bloques: {proposal.creates.length}</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={applyingId !== null}
                    onClick={() => void handleApply(proposal)}
                  >
                    {applyingId === proposal.id ? "Aplicando..." : "Aplicar propuesta"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
