import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { applyScheduleProposal, generateScheduleProposals, type ScheduleProposal } from "@/lib/api/schedules";
import { toast } from "sonner";
import { Lock, Sparkles, Trash2, Wand2 } from "lucide-react";

interface ScheduleProposalsPanelProps {
  onApplied?: () => void;
  onPreviewChange?: (proposal: ScheduleProposal | null) => void;
}

export function ScheduleProposalsPanel({ onApplied, onPreviewChange }: ScheduleProposalsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ScheduleProposal[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [replaceUnlocked, setReplaceUnlocked] = useState(false);
  const [confirmProposal, setConfirmProposal] = useState<ScheduleProposal | null>(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      onPreviewChange?.(null);
      const result = await generateScheduleProposals(replaceUnlocked);
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

  const doApply = async (proposal: ScheduleProposal) => {
    try {
      setApplyingId(proposal.id);
      setConfirmProposal(null);
      const result = await applyScheduleProposal(proposal);
      if (!result) {
        toast.error("No se pudo aplicar la propuesta");
        return;
      }

      const errors = result.result.errors.length;
      const deleted = result.deletedPriorSchedules ?? 0;
      if (errors > 0) {
        toast.warning(`Propuesta ${proposal.label} aplicada con ${errors} error(es)`);
      } else if (deleted > 0) {
        toast.success(`Propuesta ${proposal.label} aplicada — ${deleted} sesión(es) reemplazada(s)`);
      } else {
        toast.success(`Propuesta ${proposal.label} aplicada correctamente`);
      }

      onApplied?.();
      onPreviewChange?.(null);
      setProposals([]);
      setGeneratedAt(null);
    } catch (error) {
      console.error(error);
      toast.error("Error aplicando propuesta");
    } finally {
      setApplyingId(null);
    }
  };

  const handleApply = (proposal: ScheduleProposal) => {
    if (proposal.schedulesToDelete.length > 0) {
      setConfirmProposal(proposal);
    } else {
      void doApply(proposal);
    }
  };

  return (
    <>
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
          <div className="flex items-center gap-3 mb-4 p-2 rounded-md bg-muted/50">
            <Switch
              id="replace-unlocked"
              checked={replaceUnlocked}
              onCheckedChange={setReplaceUnlocked}
            />
            <div>
              <Label htmlFor="replace-unlocked" className="text-sm cursor-pointer">
                Reemplazar sesiones no bloqueadas
              </Label>
              <p className="text-xs text-muted-foreground">
                Las sesiones con candado <Lock className="inline h-3 w-3" /> se conservan como ancla; el resto se reemplaza.
              </p>
            </div>
          </div>

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
                const deleteCount = proposal.schedulesToDelete.length;
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
                      {proposal.lockedSessions > 0 && (
                        <p className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Lock className="h-3 w-3" />
                          Ancladas: {proposal.lockedSessions}
                        </p>
                      )}
                      {deleteCount > 0 && (
                        <p className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Trash2 className="h-3 w-3" />
                          Se eliminarán: {deleteCount}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={applyingId !== null}
                      onClick={() => handleApply(proposal)}
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

      <Dialog open={confirmProposal !== null} onOpenChange={(open) => { if (!open) setConfirmProposal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar aplicación de propuesta {confirmProposal?.label}</DialogTitle>
            <DialogDescription>
              Esta acción eliminará{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {confirmProposal?.schedulesToDelete.length} sesión(es) no bloqueada(s)
              </span>{" "}
              y creará{" "}
              <span className="font-semibold">
                {confirmProposal?.creates.length} nueva(s)
              </span>
              . Las sesiones bloqueadas ({confirmProposal?.lockedSessions ?? 0}) no se modificarán.
              <br />
              <br />
              Esta operación no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmProposal(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={applyingId !== null}
              onClick={() => { if (confirmProposal) void doApply(confirmProposal); }}
            >
              Confirmar y aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
