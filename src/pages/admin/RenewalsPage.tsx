import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Mail, Calendar, CheckCircle2, XCircle, Clock, Send, Eye, X,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  createRenewalCampaign,
  getRenewalCampaigns,
  getRenewalEmailPreview,
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

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<RenewalOfferStatus, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
  pending:   { label: "Pendiente",   className: "bg-amber-500/10 text-amber-700 border-amber-400/30 dark:text-amber-400", Icon: Clock },
  confirmed: { label: "Confirmada",  className: "bg-success/15 text-success border-success/20",                           Icon: CheckCircle2 },
  changed:   { label: "Parcial",     className: "bg-primary/10 text-primary border-primary/20",                           Icon: CheckCircle2 },
  released:  { label: "No renueva",  className: "bg-muted text-muted-foreground border-border",                            Icon: XCircle },
};

function getCurrentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getNextPeriod() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function guessCurrentCourse() {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  return month >= 9 ? `${year}/${String(year + 1).slice(2)}` : `${year - 1}/${String(year).slice(2)}`;
}
function guessNextCourse() {
  const cur = guessCurrentCourse();
  const [y1, y2] = cur.split("/");
  const next = Number(y1) + 1;
  return `${next}/${String(next + 1).slice(2)}`;
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── Send-email modal ─────────────────────────────────────────────────────────

interface SendEmailModalProps {
  open: boolean;
  onClose: () => void;
  campaign: RenewalCampaign;
  pendingCount: number;
  onSent: () => void;
  locked: boolean;
  onLocked: () => void;
}

function SendEmailModal({ open, onClose, campaign, pendingCount, onSent, locked, onLocked }: SendEmailModalProps) {
  const meta = campaign.metadata as Record<string, unknown>;
  const [tab, setTab] = useState<"config" | "preview">("config");
  const [scheduleText, setScheduleText] = useState((meta.scheduleText as string | undefined) ?? "");
  const [scheduleUrl,  setScheduleUrl]  = useState((meta.scheduleUrl  as string | undefined) ?? "");
  const [scheduleSend, setScheduleSend] = useState("");
  const [useSchedule, setUseSchedule]  = useState(false);
  const [previewHtml, setPreviewHtml]  = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fromCourse = (meta.fromCourse as string | undefined) ?? "Curso actual";
  const toCourse   = (meta.toCourse   as string | undefined) ?? "Próximo curso";

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const html = await getRenewalEmailPreview(campaign.id, {
        scheduleText: scheduleText || undefined,
        scheduleUrl:  scheduleUrl  || undefined,
      });
      setPreviewHtml(html);
      setTab("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar la vista previa");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Inject HTML into sandboxed iframe
  useEffect(() => {
    if (tab === "preview" && previewHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(previewHtml); doc.close(); }
    }
  }, [tab, previewHtml]);

  const handleSend = async () => {
    if (locked) { onLocked(); return; }
    setSending(true);
    try {
      const result = await sendRenewalNotifications({
        campaignId: campaign.id,
        scheduleText: scheduleText || undefined,
        scheduleUrl:  scheduleUrl  || undefined,
        scheduledAt: useSchedule && scheduleSend ? scheduleSend : undefined,
      });
      if (result.scheduledAt) {
        toast.success(`Email programado para el ${fmtDateTime(result.scheduledAt)}`);
      } else {
        toast.success(
          `${result.sent} email(s) enviado(s)` +
          (result.failed  ? ` · ${result.failed} con error`   : "") +
          (result.skipped ? ` · ${result.skipped} sin email`  : "")
        );
      }
      onSent();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Enviar correo de renovación
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
            <span className="text-muted-foreground">Curso: </span>
            <span className="font-semibold">{fromCourse} → {toCourse}</span>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
            {pendingCount} alumno(s) pendientes recibirán el email
          </div>
          {campaign.expiresAt && (
            <div className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
              Límite: {fmtDate(campaign.expiresAt)}
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "config" | "preview")} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="config" className="flex-1">Configuración</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1" disabled={!previewHtml}>
              Vista previa {previewHtml ? "" : "(genera primero)"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4 overflow-y-auto flex-1 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Horario del próximo curso (texto)</Label>
              <Textarea
                value={scheduleText}
                onChange={(e) => setScheduleText(e.target.value)}
                placeholder={"Lunes: Ballet 17:00-18:30h · Sala A\nMiércoles: Contemporáneo 18:00-19:30h · Sala B\n..."}
                rows={5}
                className="text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">Este texto aparecerá en el cuerpo del email para que los alumnos conozcan el nuevo horario.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Enlace al horario (opcional)</Label>
              <Input
                value={scheduleUrl}
                onChange={(e) => setScheduleUrl(e.target.value)}
                placeholder="https://docs.google.com/... o enlace a PDF"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Si tienes el horario en PDF o Drive, añade el enlace y los alumnos verán "Ver horario completo →" en el email.</p>
            </div>

            {/* Schedule send option */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id="use-schedule"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={useSchedule}
                  onChange={(e) => setUseSchedule(e.target.checked)}
                />
                <Label htmlFor="use-schedule" className="text-sm cursor-pointer">Programar envío para más tarde</Label>
              </div>
              {useSchedule && (
                <Input
                  type="datetime-local"
                  value={scheduleSend}
                  onChange={(e) => setScheduleSend(e.target.value)}
                  className="h-8 text-sm w-auto"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            {previewHtml ? (
              <iframe
                ref={iframeRef}
                sandbox="allow-same-origin"
                className="w-full h-[420px] rounded-lg border border-border bg-white"
                title="Vista previa del email"
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                Genera la vista previa primero.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border">
          <Button
            type="button" variant="outline" className="sm:mr-auto"
            onClick={() => void loadPreview()} disabled={loadingPreview}
          >
            {loadingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            {previewHtml ? "Actualizar vista previa" : "Ver vista previa del email"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button onClick={() => void handleSend()} disabled={sending || pendingCount === 0}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {useSchedule && scheduleSend ? "Programar envío" : `Enviar a ${pendingCount} alumno(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RenewalsPage() {
  const { billing, planLabel, startUpgrade, loading: billingLoading } = useBillingEntitlements();
  const renewalsLocked = !billingLoading && !billing.features.renewalAutomation;
  const [lockOpen, setLockOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  const [campaigns, setCampaigns] = useState<RenewalCampaign[]>([]);
  const [offers, setOffers] = useState<RenewalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  // Setup form
  const [fromCourse, setFromCourse] = useState(guessCurrentCourse);
  const [toCourse,   setToCourse]   = useState(guessNextCourse);
  const [expiresAt,  setExpiresAt]  = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | RenewalOfferStatus>("all");

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.status === "active") ?? campaigns[0] ?? null,
    [campaigns]
  );

  const filteredOffers = useMemo(
    () => statusFilter === "all" ? offers : offers.filter((o) => o.status === statusFilter),
    [offers, statusFilter]
  );

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
    if (!fromCourse.trim() || !toCourse.trim()) {
      toast.error("Indica el curso de origen y destino");
      return;
    }
    setMutating(true);
    try {
      const name = `Renovación ${fromCourse} → ${toCourse}`;
      const result = await createRenewalCampaign({
        name,
        fromPeriod: getCurrentPeriod(),
        toPeriod:   getNextPeriod(),
        expiresAt:  expiresAt || undefined,
        fromCourse: fromCourse.trim(),
        toCourse:   toCourse.trim(),
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

  const handleSendSingleEmail = async (offerId: string) => {
    if (!activeCampaign) return;
    if (renewalsLocked) { setLockOpen(true); return; }
    setSendingEmail(offerId);
    try {
      const result = await sendRenewalNotifications({ campaignId: activeCampaign.id, offerIds: [offerId] });
      if (result.sent > 0) toast.success("Email enviado correctamente");
      else if (result.skipped > 0) toast.info("Este alumno no tiene email registrado");
      else toast.error("No se pudo enviar el email");
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
          description={`Tu plan actual (${planLabel}) no incluye renovaciones automáticas.`}
          onUpgrade={() => void startUpgrade("renewalAutomation")}
        />
      )}

      <div className={renewalsLocked ? "pointer-events-none opacity-60 blur-[1px] space-y-4" : "space-y-4"}>

        {/* ── Setup ── */}
        {!loading && !activeCampaign && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Iniciar período de renovación</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Se generará una propuesta por alumno activo. Podrás enviarles un email con enlace para confirmar o rechazar cada clase individualmente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Curso actual (origen)</Label>
                <Input
                  value={fromCourse}
                  onChange={(e) => setFromCourse(e.target.value)}
                  placeholder="2024/25"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Curso siguiente (destino)</Label>
                <Input
                  value={toCourse}
                  onChange={(e) => setToCourse(e.target.value)}
                  placeholder="2025/26"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1 flex-1">
                <Label className="text-xs font-semibold">Fecha límite de respuesta (opcional)</Label>
                <Input
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
          </div>
        )}

        {/* ── Active renewal ── */}
        {activeCampaign && (() => {
          const meta = activeCampaign.metadata as Record<string, unknown>;
          const fromC = (meta.fromCourse as string | undefined) ?? "";
          const toC   = (meta.toCourse   as string | undefined) ?? "";
          return (
            <>
              {/* Stats + meta bar */}
              <div className="flex flex-wrap items-center gap-2">
                {(fromC || toC) && (
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 h-9 text-xs font-semibold text-foreground">
                    {fromC} → {toC}
                  </div>
                )}
                <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 h-9 text-xs">
                  <span className="text-muted-foreground">{counts.total} alumnos</span>
                  <span className="text-border">·</span>
                  <span className="text-amber-600 font-medium">{counts.pending} pendientes</span>
                  <span className="text-border">·</span>
                  <span className="text-success font-medium">{counts.confirmed} confirmados</span>
                  <span className="text-border">·</span>
                  <span className="text-muted-foreground">{counts.released} no renuevan</span>
                </div>
                {activeCampaign.expiresAt && (
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 h-9 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Límite: {fmtDate(activeCampaign.expiresAt)}
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 h-9 text-xs text-muted-foreground ml-auto">
                  <Mail className="h-3.5 w-3.5" />
                  {counts.emailSent} emails enviados
                </div>
              </div>

              {/* Send email button — opens modal */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setSendModalOpen(true)}
                  disabled={counts.pending === 0}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar emails a {counts.pending} pendiente(s)
                </Button>
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {(["all", "pending", "confirmed", "released"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setStatusFilter(f)}
                    className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                      statusFilter === f
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground bg-transparent"
                    )}
                  >
                    {f === "all"       ? `Todos (${counts.total})` :
                     f === "pending"   ? `Pendientes (${counts.pending})` :
                     f === "confirmed" ? `Confirmados (${counts.confirmed})` :
                                         `No renuevan (${counts.released})`}
                  </button>
                ))}
              </div>

              {/* Offers list */}
              {loadingOffers ? (
                <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></div>
              ) : filteredOffers.length === 0 ? (
                <EmptyState title="Sin resultados" description="Cambia el filtro para ver más alumnos." actionLabel="Ver todos" onAction={() => setStatusFilter("all")} />
              ) : (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  {filteredOffers.map((offer, idx) => {
                    const st = STATUS_MAP[offer.status];
                    const emailSentAt = (offer.metadata as Record<string, unknown>)?.emailSentAt as string | undefined;
                    const meta2 = activeCampaign.metadata as Record<string, unknown>;
                    const classNameMap = (meta2.classNameMap as Record<string, string> | undefined) ?? {};
                    const classNames = (offer.currentClassIds || []).map((id) => classNameMap[id] || id);

                    return (
                      <div key={offer.id}
                        className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3",
                          idx > 0 && "border-t border-border",
                          idx % 2 !== 0 && "bg-muted/20"
                        )}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                            {offer.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{offer.studentName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {offer.studentEmail || "Sin email"}
                              {classNames.length > 0 && <span> · {classNames.join(" / ")}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {offer.respondedAt && <span>Respondió {fmtDate(offer.respondedAt)} · </span>}
                              {emailSentAt ? <span className="text-success">Email enviado</span> : <span className="text-muted-foreground/60">Sin email</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-11 sm:ml-0">
                          <Badge variant="outline" className={cn("text-[10px] font-medium shrink-0", st.className)}>
                            {st.label}
                          </Badge>
                          {offer.status === "pending" && offer.studentEmail && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground"
                              disabled={sendingEmail !== null} onClick={() => void handleSendSingleEmail(offer.id)} title="Enviar email">
                              {sendingEmail === offer.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {offer.status === "pending" && (
                            <Button size="sm" variant="secondary" className="h-7 text-xs" disabled={mutating}
                              onClick={() => void handleOfferAction(offer.id, "confirm")}>Confirmar</Button>
                          )}
                          {offer.status !== "released" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive"
                              disabled={mutating} onClick={() => void handleOfferAction(offer.id, "release")}>Liberar</Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Modals */}
      {activeCampaign && (
        <SendEmailModal
          open={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          campaign={activeCampaign}
          pendingCount={counts.pending}
          onSent={() => void (activeCampaign && loadOffers(activeCampaign.id))}
          locked={renewalsLocked}
          onLocked={() => setLockOpen(true)}
        />
      )}

      <FeatureLockDialog
        open={lockOpen} onOpenChange={setLockOpen}
        title="Renovaciones disponibles en plan Pro"
        description="Para gestionar renovaciones y enviar notificaciones necesitas el plan Pro."
        onUpgrade={() => void startUpgrade("renewalAutomation")}
      />
    </PageContainer>
  );
}
