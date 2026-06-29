import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, Database, HardDrive, Pause, Play, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getTenantDetail, saveCrmNote, updateCrmStatus, setSuspended,
  type TenantDetail, type CrmStatus, type TenantSummary, type ResourceUsage,
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
        <span>Alumnos activos / límite</span><span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function ResourceRow({ label, value, icon: Icon }: { label: string; value: string | number; icon?: React.ComponentType<{className?: string}> }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </div>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtEur(cents: number) { return `${(cents / 100).toFixed(2)} €`; }

interface Props { tenant: TenantSummary | null; onClose: () => void; onSuspendChange?: (id: string, suspended: boolean) => void; }

export function TenantDetailPanel({ tenant, onClose, onSuspendChange }: Props) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<CrmStatus>("new");
  const [saving, setSaving] = useState(false);
  const [suspending, setSuspending] = useState(false);

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
    } finally { setSaving(false); }
  };

  const handleToggleSuspend = async () => {
    if (!tenant) return;
    const next = !tenant.isSuspended;
    setSuspending(true);
    try {
      await setSuspended(tenant.id, next);
      onSuspendChange?.(tenant.id, next);
      toast.success(next ? `${tenant.name} suspendida` : `${tenant.name} reactivada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally { setSuspending(false); }
  };

  const res: ResourceUsage | null = detail?.resourceUsage ?? null;

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
            <div className={cn("flex items-start justify-between px-5 py-4 border-b border-border",
              tenant.isSuspended && "bg-destructive/5")}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground truncate">{tenant.name}</p>
                  {tenant.isSuspended && (
                    <span className="shrink-0 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold px-2 py-0.5">SUSPENDIDA</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                {/* Admin email — prominent */}
                <a href={`mailto:${tenant.ownerEmail}`}
                  className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5">
                  <Mail className="h-3 w-3" />{tenant.ownerEmail}
                </a>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
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

                  {/* Revenue to Nexa */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ingresos para Nexa (Stripe)</p>
                    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Total cobrado</p>
                        <p className="text-xl font-bold text-foreground">{fmtEur(tenant.stripeTotalCents)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Pagos</p>
                        <p className="text-lg font-semibold text-foreground">{tenant.stripePaymentCount}</p>
                      </div>
                    </div>
                    {tenant.stripeTotalCents === 0 && !tenant.trialPaymentCompleted && (
                      <p className="text-xs text-muted-foreground">Trial activo — aún no ha pagado.</p>
                    )}
                  </div>

                  {/* Usage */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Uso de alumnos</p>
                    <UsageBar pct={tenant.usagePct} />
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Alumnos", value: `${tenant.activeStudents}/${tenant.maxStudents}` },
                        { label: "Inscripciones", value: String(tenant.totalEnrollments) },
                        { label: "Último", value: tenant.lastStudentAt ? fmtDate(tenant.lastStudentAt) : "—" },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg border border-border bg-muted/20 px-2 py-2 text-center">
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className="text-xs font-semibold text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Supabase resource usage */}
                  {res && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Recursos en Supabase
                      </p>
                      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-0.5">
                        <ResourceRow label="Alumnos (filas)" value={res.students} icon={Database} />
                        <ResourceRow label="Inscripciones" value={res.enrollments} />
                        <ResourceRow label="Clases" value={res.classes} />
                        <ResourceRow label="Horarios" value={res.schedules} />
                        <ResourceRow label="Pagos" value={res.payments} />
                        <ResourceRow label="Facturas" value={res.invoices} />
                        <ResourceRow label="Total filas" value={res.totalRows} />
                        <ResourceRow label="Almacenamiento" value={`${res.storageMb} MB`} icon={HardDrive} />
                      </div>
                    </div>
                  )}

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

            {/* Footer — suspend toggle */}
            <div className="border-t border-border p-4">
              <Button
                variant={tenant.isSuspended ? "outline" : "destructive"}
                size="sm"
                className="w-full"
                onClick={() => void handleToggleSuspend()}
                disabled={suspending}
              >
                {suspending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
                  tenant.isSuspended ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                {tenant.isSuspended ? "Reactivar escuela" : "Suspender escuela"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                {tenant.isSuspended
                  ? "La escuela volverá a tener acceso inmediatamente."
                  : "Los usuarios de esta escuela recibirán un error 403 al intentar acceder."}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
