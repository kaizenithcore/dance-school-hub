import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Mail, Calendar, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  createRenewalCampaign,
  getRenewalCampaigns,
  getRenewalOffers,
  sendRenewalNotifications,
  updateRenewalOffer,
  type RenewalCampaign,
  type RenewalOffer,
  type RenewalOfferStatus,
} from "@/lib/api/renewals";
import { runWithRetry } from "@/lib/reliability";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { UpgradeFeatureAlert } from "@/components/billing/UpgradeFeatureAlert";
import { FeatureLockDialog } from "@/components/billing/FeatureLockDialog";
import ModuleDisabledPage from "@/pages/admin/ModuleDisabledPage";
import { isModuleVisible } from "@/lib/moduleLifecyclePolicy";

const STATUS_MAP: Record<RenewalOfferStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:   { label: "Pendiente",      className: "bg-amber-500/10 text-amber-700 border-amber-400/30 dark:text-amber-400", icon: Clock },
  confirmed: { label: "Confirmada",     className: "bg-success/15 text-success border-success/20",                          icon: CheckCircle2 },
  changed:   { label: "Con cambios",    className: "bg-primary/10 text-primary border-primary/20",                          icon: CheckCircle2 },
  released:  { label: "No renueva",     className: "bg-muted text-muted-foreground border-border",                          icon: XCircle },
};

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function getNextPeriod() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}
function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function RenewalsPage() {
  const { billing, planLabel, startUpgrade, loading: billingLoading } = useBillingEntitlements();
  const renewalsLocked = !billingLoading && !billing.features.renewalAutomation;
  const [lockOpen, setLockOpen] = useState(false);

  // Data
  const [campaigns, setCampaigns] = useState<RenewalCampaign[]>([]);
  const [offers, setOffers] = useState<RenewalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null); // offerId or "bulk"

  // Setup form (new renewal)
  const [expiresAt, setExpiresAt] = useState("");
  const [scheduleSendAt, setScheduleSendAt] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState<"all" | RenewalOfferStatus>("all");

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.status === "active") ?? campaigns[0] ?? null,
    [campaigns]
  );

  const filteredOffers = useMemo(() => {
    if (statusFilter === "all") return offers;
    return offers.filter((o) => o.status === statusFilter);
  }, [offers, statusFilter]);

  const counts = useMemo(() => ({
    total:     offers.length,
    pending:   offers.filter((o) => o.status === "pending").length,
    confirmed: offers.filter((o) => o.status === "confirmed" || o.status === "changed").length,
    released:  offers.filter((o) => o.status === "released").length,
    emailSent: offers.filter((o) => !!(o.metadata as Record<string, unknown>)?.emailSentAt).length,
  }), [offers]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRenewalCampaigns();
      setCampaigns(data);
      const active = data.find((c) => c.status === "active") ?? data[0];
      if (active) await loadOffers(active.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar la renovación");
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async (campaignId: string) => {
    setLoadingOffers(true);
    try {
      const data = await getRenewalOffers(campaignId);
      setOffers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron cargar los alumnos");
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (!isModuleVisible("renewals")) return <ModuleDisabledPage moduleKey="renewals" />;

  const handleCreate = async () => {
    if (renewalsLocked) { setLockOpen(true); return; }
    setMutating(true);
    try {
      const name = `Renovación ${getNextPeriod()}`;
      const result = await createRenewalCampaign({
        name,
        fromPeriod: getCurrentPeriod(),
        toPeriod: getNextPeriod(),
        expiresAt: expiresAt || undefined,
      });
      toast.success(`Renovación creada con ${result.offersCount} alumno(s)`);
      setExpiresAt("");
      const refreshed = await runWithRetry(async () => {
        const data = await getRenewalCampaigns();
        if (!data.some((c) => c.id === result.campaignId)) throw new Error("Sincronizando…");
        return data;
      }, { retries: 3, delayMs: 400 });
      setCampaigns(refreshed);
      await loadOffers(result.campaignId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la renovación");
    } finally {
      setMutating(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: "confirm" | "release") => {
    if (!activeCampaign) return;
    setMutating(true);
    try {
      await updateRenewalOffer({ campaignId: activeCampaign.id, offerId, action });
      toast.success(action === "confirm" ? "Plaza confirmada" : "Plaza liberada");
      await loadOffers(activeCampaign.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setMutating(false);
    }
  };

  const handleSendEmail = async (offerId?: string) => {
    if (!activeCampaign) return;
    if (renewalsLocked) { setLockOpen(true); return; }
    const key = offerId ?? "bulk";
    setSendingEmail(key);
    try {
      const payload = {
        campaignId: activeCampaign.id,
        offerIds: offerId ? [offerId] : undefined,
        scheduledAt: !offerId && showSchedule && scheduleSendAt ? scheduleSendAt : undefined,
      };
      const result = await sendRenewalNotifications(payload);
      if (result.scheduledAt) {
        toast.success(`Email programado para el ${formatDateTime(result.scheduledAt)}`);
        setShowSchedule(false);
        setScheduleSendAt("");
      } else {
        toast.success(`${result.sent} email(s) enviado(s)${result.failed ? `, ${result.failed} con error` : ""}${result.skipped ? `, ${result.skipped} sin email` : ""}`);
      }
      await loadOffers(activeCampaign.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el email");
    } finally {
      setSendingEmail(null);
    }
  };

  return (
    <PageContainer
      title="Renovación de alumnos"
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || loadingOffers}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Recargar</span>
        </Button>
      }
    >
      {renewalsLocked && (
        <UpgradeFeatureAlert
          title="Renovaciones automáticas — plan Pro"
          description={`Tu plan actual (${planLabel}) no incluye renovaciones automáticas. Mejora a Pro para activarlas.`}
          onUpgrade={() => void startUpgrade("renewalAutomation")}
        />
      )}

      <div className={renewalsLocked ? "pointer-events-none opacity-60 blur-[1px] space-y-4" : "space-y-4"}>

        {/* ── Setup: no active renewal yet ── */}
        {!loading && !activeCampaign && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Iniciar período de renovación</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Se generará una propuesta para cada alumno activo. Podrás enviarles un email con enlace de confirmación o rechazo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1 flex-1">
                <Label htmlFor="expires" className="text-xs font-semibold">Fecha límite de respuesta</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <Button onClick={() => void handleCreate()} disabled={mutating} className="shrink-0">
                {mutating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
                Iniciar renovación
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              El sistema tomará los alumnos del período actual ({getCurrentPeriod()}) y generará propuestas para el siguiente ({getNextPeriod()}).
            </p>
          </div>
        )}

        {/* ── Active renewal ── */}
        {activeCampaign && (
          <>
            {/* Stats inline + deadline */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 h-9 text-xs">
                <span className="text-muted-foreground">{counts.total} alumnos</span>
                <span className="text-border">·</span>
                <span className="text-amber-600 font-medium">{counts.pending} pendientes</span>
                <span className="text-border">·</span>
                <span className="text-success font-medium">{counts.confirmed} confirmados</span>
                <span className="text-border">·</span>
                <span className="text-muted-foreground">{counts.released} no renuevan</span>
              </div>
              {activeCampaign.expiresAt && (
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 h-9 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Límite: {formatDate(activeCampaign.expiresAt)}
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 h-9 text-xs text-muted-foreground ml-auto">
                <Mail className="h-3.5 w-3.5" />
                {counts.emailSent} emails enviados
              </div>
            </div>

            {/* Email actions panel */}
            <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground flex-1">Notificar a alumnos</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSchedule((s) => !s)}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  {showSchedule ? "Enviar ahora" : "Programar envío"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleSendEmail()}
                  disabled={sendingEmail !== null || counts.pending === 0}
                >
                  {sendingEmail === "bulk" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                  {showSchedule ? "Programar" : `Enviar a ${counts.pending} pendiente(s)`}
                </Button>
              </div>

              {showSchedule && (
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={scheduleSendAt}
                    onChange={(e) => setScheduleSendAt(e.target.value)}
                    className="h-8 text-sm w-auto"
                  />
                  <p className="text-xs text-muted-foreground">El email se enviará en la fecha y hora indicadas.</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                El email incluye un enlace para que el alumno confirme o rechace su plaza sin necesidad de iniciar sesión.
              </p>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {(["all", "pending", "confirmed", "released"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    statusFilter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground bg-transparent"
                  )}
                >
                  {f === "all" ? `Todos (${counts.total})` :
                   f === "pending" ? `Pendientes (${counts.pending})` :
                   f === "confirmed" ? `Confirmados (${counts.confirmed})` :
                   `No renuevan (${counts.released})`}
                </button>
              ))}
            </div>

            {/* Offers table */}
            {loadingOffers ? (
              <div className="py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : filteredOffers.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                description="Cambia el filtro para ver más alumnos."
                actionLabel="Ver todos"
                onAction={() => setStatusFilter("all")}
              />
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {filteredOffers.map((offer, idx) => {
                  const st = STATUS_MAP[offer.status];
                  const emailSentAt = (offer.metadata as Record<string, unknown>)?.emailSentAt as string | undefined;
                  return (
                    <div
                      key={offer.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-border",
                        idx > 0 && "border-t",
                        idx % 2 !== 0 && "bg-muted/20"
                      )}
                    >
                      {/* Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                          {offer.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{offer.studentName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {offer.studentEmail || "Sin email"}
                            {offer.respondedAt && <span> · Respondió {formatDate(offer.respondedAt)}</span>}
                            {emailSentAt && <span className="text-success"> · Email enviado</span>}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 ml-11 sm:ml-0">
                        <Badge variant="outline" className={cn("text-[10px] font-medium shrink-0", st.className)}>
                          {st.label}
                        </Badge>

                        {offer.status === "pending" && offer.studentEmail && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            disabled={sendingEmail !== null}
                            onClick={() => void handleSendEmail(offer.id)}
                            title="Enviar email de renovación"
                          >
                            {sendingEmail === offer.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Mail className="h-3.5 w-3.5" />}
                          </Button>
                        )}

                        {offer.status === "pending" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs"
                            disabled={mutating}
                            onClick={() => void handleOfferAction(offer.id, "confirm")}
                          >
                            Confirmar
                          </Button>
                        )}
                        {offer.status !== "released" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            disabled={mutating}
                            onClick={() => void handleOfferAction(offer.id, "release")}
                          >
                            Liberar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <FeatureLockDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title="Renovaciones disponibles en plan Pro"
        description="Para gestionar renovaciones y enviar notificaciones a alumnos necesitas el plan Pro."
        onUpgrade={() => void startUpgrade("renewalAutomation")}
      />
    </PageContainer>
  );
}
