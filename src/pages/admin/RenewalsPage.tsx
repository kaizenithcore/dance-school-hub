import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Mail, Calendar, CheckCircle2, XCircle, Clock, Send, Eye,
  Search, ArrowUpDown, ChevronUp, ChevronDown, Table2, Link as LinkIcon,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { getSchedules, type ScheduleWithRelations } from "@/lib/api/schedules";
import { getClasses, type ClassWithRelations } from "@/lib/api/classes";
import { runWithRetry } from "@/lib/reliability";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { UpgradeFeatureAlert } from "@/components/billing/UpgradeFeatureAlert";
import { FeatureLockDialog } from "@/components/billing/FeatureLockDialog";
import ModuleDisabledPage from "@/pages/admin/ModuleDisabledPage";
import { isModuleVisible } from "@/lib/moduleLifecyclePolicy";

// ── constants ─────────────────────────────────────────────────────────────────

const WEEKDAY: Record<number, string> = {
  1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves",
  5: "Viernes", 6: "Sábado", 7: "Domingo",
};

const OFFER_STATUS: Record<string, { label: string; className: string }> = {
  pending_unsent: { label: "Sin notificar",  className: "bg-muted text-muted-foreground border-border" },
  pending_sent:   { label: "Email enviado",  className: "bg-primary/10 text-primary border-primary/20" },
  confirmed:      { label: "Confirmada",     className: "bg-success/15 text-success border-success/20" },
  changed:        { label: "Parcial",        className: "bg-primary/10 text-primary border-primary/20" },
  released:       { label: "No renueva",     className: "bg-muted text-muted-foreground border-border" },
};

function offerDisplayStatus(offer: RenewalOffer): string {
  if (offer.status === "confirmed") return "confirmed";
  if (offer.status === "changed")   return "changed";
  if (offer.status === "released")  return "released";
  const emailSent = !!(offer.metadata as Record<string, unknown>)?.emailSentAt;
  return emailSent ? "pending_sent" : "pending_unsent";
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getCurrentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getNextPeriod() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function guessCurrentCourse() {
  const y = new Date().getFullYear(); const m = new Date().getMonth() + 1;
  return m >= 9 ? `${y}/${String(y + 1).slice(2)}` : `${y - 1}/${String(y).slice(2)}`;
}
function guessNextCourse() {
  const [y1] = guessCurrentCourse().split("/"); const n = Number(y1) + 1;
  return `${n}/${String(n + 1).slice(2)}`;
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(t: string) { return t.slice(0, 5); }

// ── schedule HTML generator ──────────────────────────────────────────────────

interface ScheduleRow { className: string; teacherName: string; weekday: number; startTime: string; endTime: string; roomName: string }

function buildScheduleEmailHtml(rows: ScheduleRow[], primaryColor: string): string {
  const sorted = [...rows].sort((a, b) => a.weekday !== b.weekday ? a.weekday - b.weekday : a.startTime.localeCompare(b.startTime));
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trs = sorted.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
      <td style="padding:7px 12px;font-size:13px;color:#334155;">${esc(r.className)}</td>
      <td style="padding:7px 12px;font-size:13px;color:#475569;">${esc(WEEKDAY[r.weekday] ?? `Día ${r.weekday}`)}</td>
      <td style="padding:7px 12px;font-size:13px;color:#334155;white-space:nowrap;">${esc(fmtTime(r.startTime))}–${esc(fmtTime(r.endTime))}</td>
      <td style="padding:7px 12px;font-size:13px;color:#475569;">${esc(r.teacherName || "—")}</td>
      <td style="padding:7px 12px;font-size:13px;color:#475569;">${esc(r.roomName || "—")}</td>
    </tr>`).join("");

  return `<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
  <thead>
    <tr style="background:${esc(primaryColor)};">
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#fff;font-size:12px;">Clase</th>
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#fff;font-size:12px;">Día</th>
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#fff;font-size:12px;">Horario</th>
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#fff;font-size:12px;">Profesor</th>
      <th style="padding:8px 12px;text-align:left;font-weight:600;color:#fff;font-size:12px;">Aula</th>
    </tr>
  </thead>
  <tbody>${trs}</tbody>
</table>`;
}

// ── SendEmailModal ────────────────────────────────────────────────────────────

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
  const [tab, setTab] = useState<"schedule" | "preview">("schedule");

  // Schedule selector state
  const [scheduleRows, setScheduleRows] = useState<(ScheduleRow & { key: string })[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleUrl, setScheduleUrl] = useState((meta.scheduleUrl as string | undefined) ?? "");
  const [generatedHtml, setGeneratedHtml] = useState((meta.scheduleHtml as string | undefined) ?? "");
  const [primaryColor] = useState("#7C3AED"); // TODO: get from branding context

  // Send/preview state
  const [scheduleSend, setScheduleSend] = useState("");
  const [useSchedule, setUseSchedule] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fromCourse = (meta.fromCourse as string | undefined) ?? "Curso actual";
  const toCourse   = (meta.toCourse   as string | undefined) ?? "Próximo curso";

  // Load classes + schedules when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingSchedule(true);
    Promise.all([getSchedules(), getClasses()])
      .then(([schedules, classes]) => {
        const classById = new Map<string, ClassWithRelations>(classes.map((c) => [c.id, c]));
        const rows: (ScheduleRow & { key: string })[] = schedules
          .filter((s) => s.is_active !== false)
          .map((s: ScheduleWithRelations) => {
            const cls = classById.get(s.class_id);
            const teacherName = cls?.teachers?.[0]?.name ?? cls?.teacher?.name ?? "";
            return {
              key: s.id,
              className:   s.className   ?? cls?.name ?? "Clase",
              teacherName,
              weekday:     s.weekday,
              startTime:   s.start_time,
              endTime:     s.end_time,
              roomName:    s.roomName ?? "",
            };
          })
          .sort((a, b) => a.weekday !== b.weekday ? a.weekday - b.weekday : a.startTime.localeCompare(b.startTime));

        setScheduleRows(rows);
        // Auto-select all if nothing was already configured
        if (!generatedHtml) {
          setSelectedKeys(new Set(rows.map((r) => r.key)));
        }
      })
      .catch(() => toast.error("No se pudo cargar el horario de clases"))
      .finally(() => setLoadingSchedule(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleGenerateTable = () => {
    const selected = scheduleRows.filter((r) => selectedKeys.has(r.key));
    if (selected.length === 0) { toast.error("Selecciona al menos una clase"); return; }
    const html = buildScheduleEmailHtml(selected, primaryColor);
    setGeneratedHtml(html);
    toast.success("Tabla de horario generada — puedes ver la vista previa del email");
  };

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const html = await getRenewalEmailPreview(campaign.id, {
        scheduleUrl:  scheduleUrl  || undefined,
        scheduleHtml: generatedHtml || undefined,
      });
      setPreviewHtml(html);
      setTab("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar la vista previa");
    } finally {
      setLoadingPreview(false);
    }
  };

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
        scheduleUrl:  scheduleUrl  || undefined,
        scheduleHtml: generatedHtml || undefined,
        scheduledAt: useSchedule && scheduleSend ? scheduleSend : undefined,
      });
      if (result.scheduledAt) {
        toast.success(`Email programado para el ${fmtDateTime(result.scheduledAt)}`);
      } else {
        toast.success(
          `${result.sent} email(s) enviado(s)` +
          (result.failed  ? ` · ${result.failed} con error`  : "") +
          (result.skipped ? ` · ${result.skipped} sin email` : "")
        );
      }
      onSent(); onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  const toggleKey = (key: string) => setSelectedKeys((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Enviar correo de renovación
          </DialogTitle>
        </DialogHeader>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 font-semibold">
            {fromCourse} → {toCourse}
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
            {pendingCount} alumno(s) pendientes
          </div>
          {campaign.expiresAt && (
            <div className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
              Límite: {fmtDate(campaign.expiresAt)}
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "schedule" | "preview")} className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="schedule" className="flex-1 gap-1.5"><Table2 className="h-3.5 w-3.5" />Horario</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 gap-1.5" disabled={!previewHtml}>
              <Eye className="h-3.5 w-3.5" />{previewHtml ? "Vista previa" : "Vista previa (genera primero)"}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: schedule ── */}
          <TabsContent value="schedule" className="overflow-y-auto flex-1 space-y-4 pt-1">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Clases a incluir en el horario</Label>
                <div className="flex gap-1.5">
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedKeys(new Set(scheduleRows.map((r) => r.key)))}>
                    Todas
                  </button>
                  <span className="text-muted-foreground text-xs">·</span>
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedKeys(new Set())}>
                    Ninguna
                  </button>
                </div>
              </div>

              {loadingSchedule ? (
                <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando clases…
                </div>
              ) : scheduleRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">No hay clases con horario configurado.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  {scheduleRows.map((row, idx) => (
                    <button key={row.key} type="button" onClick={() => toggleKey(row.key)}
                      className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        idx > 0 && "border-t border-border",
                        selectedKeys.has(row.key) ? "bg-primary/5" : "bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className={cn("h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                        selectedKeys.has(row.key) ? "border-primary bg-primary" : "border-border"
                      )}>
                        {selectedKeys.has(row.key) && (
                          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-primary-foreground fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 4l2.5 2.5L9 1" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{row.className}</p>
                        <p className="text-xs text-muted-foreground">
                          {WEEKDAY[row.weekday]} · {fmtTime(row.startTime)}–{fmtTime(row.endTime)}
                          {row.teacherName && <span> · {row.teacherName}</span>}
                          {row.roomName && <span> · {row.roomName}</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={handleGenerateTable}
                disabled={selectedKeys.size === 0}>
                <Table2 className="h-3.5 w-3.5" />
                {generatedHtml ? "Regenerar tabla" : "Insertar tabla en el email"}
              </Button>
              {generatedHtml && (
                <p className="text-xs text-success mt-1">✓ Tabla de horario lista para incluir en el email</p>
              )}
            </div>

            {/* External URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <LinkIcon className="h-3 w-3" /> Enlace externo (opcional)
              </Label>
              <Input value={scheduleUrl} onChange={(e) => setScheduleUrl(e.target.value)}
                placeholder="https://docs.google.com/... o enlace a PDF" className="text-sm h-8" />
              <p className="text-xs text-muted-foreground">Aparecerá como "Ver horario completo →" debajo de la tabla.</p>
            </div>

            {/* Schedule send */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input id="use-sched" type="checkbox" className="h-4 w-4 rounded border-border"
                  checked={useSchedule} onChange={(e) => setUseSchedule(e.target.checked)} />
                <Label htmlFor="use-sched" className="text-sm cursor-pointer">Programar envío para más tarde</Label>
              </div>
              {useSchedule && (
                <Input type="datetime-local" value={scheduleSend}
                  onChange={(e) => setScheduleSend(e.target.value)} className="h-8 text-sm w-auto" />
              )}
            </div>
          </TabsContent>

          {/* ── Tab: preview ── */}
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            {previewHtml ? (
              <iframe ref={iframeRef} sandbox="allow-same-origin"
                className="w-full h-[400px] rounded-lg border border-border bg-white" title="Vista previa" />
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                Genera la vista previa primero.
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border shrink-0">
          <Button type="button" variant="outline" className="sm:mr-auto gap-1.5"
            onClick={() => void loadPreview()} disabled={loadingPreview}>
            {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            {previewHtml ? "Actualizar vista previa" : "Ver vista previa del email"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button onClick={() => void handleSend()} disabled={sending || pendingCount === 0}>
            {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            {useSchedule && scheduleSend ? "Programar envío" : `Enviar a ${pendingCount} alumno(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type SortKey = "name" | "status" | "email";

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

  // Table state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.status === "active") ?? campaigns[0] ?? null,
    [campaigns]
  );

  const classNameMap = useMemo(
    () => ((activeCampaign?.metadata as Record<string, unknown>)?.classNameMap as Record<string, string> | undefined) ?? {},
    [activeCampaign]
  );

  const enrichedOffers = useMemo(() => offers.map((o) => ({
    ...o,
    displayStatus: offerDisplayStatus(o),
    classNames: (o.currentClassIds || []).map((id) => classNameMap[id] || id),
    emailSentAt: (o.metadata as Record<string, unknown>)?.emailSentAt as string | undefined,
  })), [offers, classNameMap]);

  const filtered = useMemo(() => {
    let rows = enrichedOffers;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.studentName.toLowerCase().includes(q) || r.studentEmail.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") rows = rows.filter((r) => r.displayStatus === statusFilter);
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "name")   return a.studentName.localeCompare(b.studentName, "es") * dir;
      if (sortKey === "email")  return (a.studentEmail || "").localeCompare(b.studentEmail || "", "es") * dir;
      if (sortKey === "status") return a.displayStatus.localeCompare(b.displayStatus) * dir;
      return 0;
    });
  }, [enrichedOffers, search, statusFilter, sortKey, sortDir]);

  const counts = useMemo(() => ({
    total:       enrichedOffers.length,
    pending:     enrichedOffers.filter((o) => o.status === "pending").length,
    confirmed:   enrichedOffers.filter((o) => o.status === "confirmed" || o.status === "changed").length,
    released:    enrichedOffers.filter((o) => o.status === "released").length,
    emailSent:   enrichedOffers.filter((o) => !!o.emailSentAt).length,
  }), [enrichedOffers]);

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
    try { setOffers(await getRenewalOffers(campaignId)); }
    catch (err) { toast.error(err instanceof Error ? err.message : "No se pudieron cargar los alumnos"); }
    finally { setLoadingOffers(false); }
  };

  useEffect(() => { void load(); }, []);

  if (!isModuleVisible("renewals")) return <ModuleDisabledPage moduleKey="renewals" />;

  const handleCreate = async () => {
    if (renewalsLocked) { setLockOpen(true); return; }
    if (!fromCourse.trim() || !toCourse.trim()) { toast.error("Indica el curso de origen y destino"); return; }
    setMutating(true);
    try {
      const result = await createRenewalCampaign({
        name:       `Renovación ${fromCourse} → ${toCourse}`,
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
    } finally { setMutating(false); }
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
    } finally { setMutating(false); }
  };

  const handleSendSingleEmail = async (offerId: string) => {
    if (!activeCampaign) return;
    if (renewalsLocked) { setLockOpen(true); return; }
    setSendingEmail(offerId);
    try {
      const result = await sendRenewalNotifications({ campaignId: activeCampaign.id, offerIds: [offerId] });
      if (result.sent > 0)    toast.success("Email enviado correctamente");
      else if (result.skipped > 0) toast.info("Este alumno no tiene email registrado");
      else toast.error("No se pudo enviar el email");
      await loadOffers(activeCampaign.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el email");
    } finally { setSendingEmail(null); }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
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
              <h2 className="text-sm font-semibold">Iniciar período de renovación</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Se generará una propuesta por alumno activo. Podrás enviarles un email con el horario del próximo curso y un enlace para confirmar o rechazar cada clase individualmente.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Curso actual (origen)</Label>
                <Input value={fromCourse} onChange={(e) => setFromCourse(e.target.value)} placeholder="2024/25" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Curso siguiente (destino)</Label>
                <Input value={toCourse} onChange={(e) => setToCourse(e.target.value)} placeholder="2025/26" className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1 flex-1">
                <Label className="text-xs font-semibold">Fecha límite de respuesta (opcional)</Label>
                <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-9 text-sm" />
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
          const m = activeCampaign.metadata as Record<string, unknown>;
          const fc = (m.fromCourse as string | undefined) ?? "";
          const tc = (m.toCourse   as string | undefined) ?? "";
          return (
            <>
              {/* Stats bar */}
              <div className="flex flex-wrap items-center gap-2">
                {(fc || tc) && (
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 h-9 text-xs font-semibold">
                    {fc} → {tc}
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
                    <Clock className="h-3.5 w-3.5" /> Límite: {fmtDate(activeCampaign.expiresAt)}
                  </div>
                )}
                <Button size="sm" className="ml-auto" onClick={() => setSendModalOpen(true)} disabled={counts.pending === 0}>
                  <Mail className="h-4 w-4 mr-1.5" /> Enviar emails ({counts.pending} pendientes)
                </Button>
              </div>

              {/* Search + filter chips */}
              <div className="space-y-2">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar por nombre o email…" value={search}
                    onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "all",           label: `Todos (${counts.total})` },
                    { key: "pending_unsent",label: "Sin notificar" },
                    { key: "pending_sent",  label: `Email enviado (${counts.emailSent})` },
                    { key: "confirmed",     label: `Confirmados (${counts.confirmed})` },
                    { key: "released",      label: `No renuevan (${counts.released})` },
                  ].map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setStatusFilter(key)}
                      className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                        statusFilter === key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              {loadingOffers ? (
                <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /></div>
              ) : filtered.length === 0 ? (
                <EmptyState title="Sin resultados" description="Cambia el filtro o la búsqueda."
                  actionLabel="Ver todos" onAction={() => { setStatusFilter("all"); setSearch(""); }} />
              ) : (
                <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">
                          <button type="button" onClick={() => toggleSort("name")}
                            className="inline-flex items-center gap-1 hover:text-foreground">
                            Alumno <SortIcon k="name" />
                          </button>
                        </TableHead>
                        <TableHead className="text-xs">Clases</TableHead>
                        <TableHead className="text-xs">
                          <button type="button" onClick={() => toggleSort("status")}
                            className="inline-flex items-center gap-1 hover:text-foreground">
                            Estado <SortIcon k="status" />
                          </button>
                        </TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Respuesta</TableHead>
                        <TableHead className="text-xs text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((offer, idx) => {
                        const st = OFFER_STATUS[offer.displayStatus] ?? OFFER_STATUS.pending_unsent;
                        return (
                          <TableRow key={offer.id} className={cn("hover:bg-accent/50", idx % 2 !== 0 && "bg-muted/20")}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                                  {offer.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{offer.studentName}</p>
                                  <p className="text-xs text-muted-foreground">{offer.studentEmail || "Sin email"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {offer.classNames.length === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {offer.classNames.slice(0, 2).map((cn2) => (
                                    <p key={cn2} className="text-xs text-foreground truncate max-w-[160px]">{cn2}</p>
                                  ))}
                                  {offer.classNames.length > 2 && (
                                    <p className="text-[10px] text-muted-foreground">+{offer.classNames.length - 2} más</p>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-[10px] font-medium", st.className)}>
                                {st.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {offer.respondedAt ? fmtDate(offer.respondedAt) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                {/* Send email */}
                                {offer.status === "pending" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-7 w-7"
                                        disabled={sendingEmail !== null || !offer.studentEmail}
                                        onClick={() => void handleSendSingleEmail(offer.id)}>
                                        {sendingEmail === offer.id
                                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          : <Mail className="h-3.5 w-3.5" />}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      {offer.studentEmail ? "Enviar email" : "Sin email"}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {/* Confirm */}
                                {offer.status === "pending" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success"
                                        disabled={mutating} onClick={() => void handleOfferAction(offer.id, "confirm")}>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Confirmar plaza</TooltipContent>
                                  </Tooltip>
                                )}
                                {/* Release */}
                                {offer.status !== "released" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        disabled={mutating} onClick={() => void handleOfferAction(offer.id, "release")}>
                                        <XCircle className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Liberar plaza</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {activeCampaign && (
        <SendEmailModal
          open={sendModalOpen} onClose={() => setSendModalOpen(false)}
          campaign={activeCampaign} pendingCount={counts.pending}
          onSent={() => void (activeCampaign && loadOffers(activeCampaign.id))}
          locked={renewalsLocked} onLocked={() => setLockOpen(true)}
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
