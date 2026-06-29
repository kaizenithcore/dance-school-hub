import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getTenantDetail, saveCrmNote, updateCrmStatus,
  type TenantDetail, type CrmStatus, type TenantSummary,
} from "@/lib/api/platformAdmin";

const CRM_LABELS: Record<CrmStatus, { label: string; className: string }> = {
  new:       { label: "Nueva",      className: "bg-muted text-muted-foreground border-border" },
  contacted: { label: "Contactada", className: "bg-primary/10 text-primary border-primary/20" },
  active:    { label: "Activa",     className: "bg-success/15 text-success border-success/20" },
  at_risk:   { label: "En riesgo",  className: "bg-amber-500/10 text-amber-700 border-amber-400/30" },
  churned:   { label: "Perdida",    className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function UsageBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-success";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Uso de alumnos</span><span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  tenant: TenantSummary | null;
  onClose: () => void;
}

export function TenantDetailPanel({ tenant, onClose }: Props) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<CrmStatus>("new");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) { setDetail(null); return; }
    setLoading(true);
    setNote("");
    setStatus(tenant.crmStatus);
    getTenantDetail(tenant.id)
      .then(setDetail)
      .catch(() => toast.error("No se pudo cargar el detalle"))
      .finally(() => setLoading(false));
  }, [tenant?.id]);

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      if (note.trim()) {
        await saveCrmNote(tenant.id, note.trim(), status);
        toast.success("Nota guardada");
      } else {
        await updateCrmStatus(tenant.id, status);
        toast.success("Estado actualizado");
      }
      setNote("");
      const updated = await getTenantDetail(tenant.id);
      setDetail(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {tenant && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={onClose} />
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-96 bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-bold text-foreground">{tenant.name}</p>
                <p className="text-xs text-muted-foreground">{tenant.slug} · {tenant.ownerEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/s/${tenant.slug}`} target="_blank" rel="noreferrer"
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button type="button" onClick={onClose}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {/* Billing */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suscripción</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Plan", value: tenant.planType.toUpperCase() },
                        { label: "Estado", value: tenant.trialPaymentCompleted ? "Activa" : `Trial (${tenant.daysUntilTrialExpiry ?? 0}d)` },
                        { label: "Alta", value: fmtDate(tenant.createdAt) },
                        { label: "Trial expira", value: tenant.trialPaymentCompleted ? "—" : fmtDate(tenant.trialExpiresAt) },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Uso</p>
                    <UsageBar pct={tenant.usagePct} />
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Alumnos", value: `${tenant.activeStudents}/${tenant.maxStudents}` },
                        { label: "Inscripciones", value: String(tenant.totalEnrollments) },
                        { label: "Cobrado", value: `${(tenant.totalPaymentsCents / 100).toFixed(0)}€` },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-center">
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                    {tenant.lastStudentAt && (
                      <p className="text-xs text-muted-foreground">Último alumno: {fmtDate(tenant.lastStudentAt)}</p>
                    )}
                  </div>

                  {/* CRM */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">CRM</p>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Estado comercial</Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as CrmStatus)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CRM_LABELS).map(([k, { label }]) => (
                            <SelectItem key={k} value={k}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Añadir nota</Label>
                      <Textarea value={note} onChange={(e) => setNote(e.target.value)}
                        placeholder="Contactado por email, interesado en plan Pro..." rows={3} className="text-sm resize-none" />
                    </div>
                    <Button size="sm" className="w-full" onClick={() => void handleSave()} disabled={saving}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                      {note.trim() ? "Guardar nota" : "Actualizar estado"}
                    </Button>
                  </div>

                  {/* Notes history */}
                  {detail && detail.crmNotes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Historial</p>
                      {detail.crmNotes.slice(0, 8).map((n) => {
                        const st = CRM_LABELS[n.status];
                        return (
                          <div key={n.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", st.className)}>{st.label}</span>
                              <span className="text-[10px] text-muted-foreground">{fmtDate(n.updatedAt)}</span>
                            </div>
                            {n.note && <p className="text-xs text-foreground">{n.note}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
