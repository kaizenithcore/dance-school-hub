import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send, Mail, Users, Clock, CheckCircle2, Settings, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";
import {
  getWaitlistOverview,
  offerNextWaitlistSpot,
  processExpiredWaitlistOffers,
  type WaitlistClassQueue,
  type WaitlistEntry,
} from "@/lib/api/waitlist";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { UpgradeFeatureAlert } from "@/components/billing/UpgradeFeatureAlert";
import { FeatureLockDialog } from "@/components/billing/FeatureLockDialog";
import { runWithRetry } from "@/lib/reliability";
import { toastErrorOnce } from "@/lib/toastPremium";

const WAITLIST_STATUS_LABELS: Record<WaitlistEntry["status"], string> = {
  pending: "Pendiente",
  offered: "Oferta enviada",
  enrolled: "Inscrito",
  expired: "Vencida",
  cancelled: "Cancelada",
};

const WAITLIST_SELECTED_CLASS_KEY = "nexa:waitlist:selected-class";
const WAITLIST_CLASSES_CACHE_KEY = "nexa:waitlist:classes-cache";
const WAITLIST_OVERVIEW_CACHE_KEY = "nexa:waitlist:overview-cache";

interface WaitlistOverviewCache {
  selectedClassId: string;
  classes: WaitlistClassQueue[];
  entries: WaitlistEntry[];
}

function persistSelectedClassId(classId: string): void {
  if (typeof window === "undefined") return;

  if (!classId) {
    window.localStorage.removeItem(WAITLIST_SELECTED_CLASS_KEY);
    return;
  }

  window.localStorage.setItem(WAITLIST_SELECTED_CLASS_KEY, classId);
}

function persistOverviewCache(cache: WaitlistOverviewCache): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WAITLIST_OVERVIEW_CACHE_KEY, JSON.stringify(cache));
}

function readStoredOverviewCache(): WaitlistOverviewCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(WAITLIST_OVERVIEW_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WaitlistOverviewCache;
    if (!parsed || !Array.isArray(parsed.classes) || !Array.isArray(parsed.entries)) {
      return null;
    }

    return {
      selectedClassId: parsed.selectedClassId || "",
      classes: parsed.classes,
      entries: parsed.entries,
    };
  } catch {
    return null;
  }
}

function readStoredClassId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(WAITLIST_SELECTED_CLASS_KEY) || "";
}

function readStoredClassesCache(): WaitlistClassQueue[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WAITLIST_CLASSES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WaitlistClassQueue[]) : [];
  } catch {
    return [];
  }
}

export default function WaitlistPage() {
  const navigate = useNavigate();
  const { billing, planLabel, startUpgrade, loading: billingLoading } = useBillingEntitlements();
  const storedOverviewCache = readStoredOverviewCache();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [autoProcess, setAutoProcess] = useState(() => window.localStorage.getItem("nexa:waitlist:auto-process") === "1");
  const [showConfig, setShowConfig] = useState(false);
  const [classes, setClasses] = useState<WaitlistClassQueue[]>(() => {
    if (storedOverviewCache?.classes.length) {
      return storedOverviewCache.classes;
    }

    return readStoredClassesCache();
  });
  const [entries, setEntries] = useState<WaitlistEntry[]>(() => storedOverviewCache?.entries || []);
  const [selectedClassId, setSelectedClassId] = useState<string>(() =>
    readStoredClassId() || storedOverviewCache?.selectedClassId || ""
  );
  const requestSequenceRef = useRef(0);
  const waitlistLocked = !billingLoading && !billing.features.waitlistAutomation;

  const selectedClass = useMemo(
    () => classes.find((item) => item.classId === selectedClassId) || null,
    [classes, selectedClassId]
  );
  const pendingEntriesCount = useMemo(
    () => entries.filter((entry) => entry.status === "pending").length,
    [entries]
  );
  const offeredEntriesCount = useMemo(
    () => entries.filter((entry) => entry.status === "offered").length,
    [entries]
  );

  const loadData = async (nextClassId?: string) => {
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;

    setLoading(true);
    setLoadError(null);
    try {
      const response = await runWithRetry(
        async () => getWaitlistOverview(nextClassId || selectedClassId || undefined),
        { retries: 1, delayMs: 350 }
      );

      if (requestId !== requestSequenceRef.current) {
        return;
      }

      setClasses(response.classes);
      setEntries(response.entries);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(WAITLIST_CLASSES_CACHE_KEY, JSON.stringify(response.classes));
      }

      const fallbackClassId =
        response.selectedClassId || nextClassId || selectedClassId || readStoredClassId() || response.classes[0]?.classId || "";
      setSelectedClassId(fallbackClassId);
      persistSelectedClassId(fallbackClassId);
      persistOverviewCache({
        selectedClassId: fallbackClassId,
        classes: response.classes,
        entries: response.entries,
      });

      if (!response.selectedClassId && fallbackClassId && fallbackClassId !== nextClassId) {
        const refresh = await runWithRetry(
          async () => getWaitlistOverview(fallbackClassId),
          { retries: 1, delayMs: 300 }
        );

        if (requestId !== requestSequenceRef.current) {
          return;
        }

        setEntries(refresh.entries);
        persistOverviewCache({
          selectedClassId: fallbackClassId,
          classes: response.classes,
          entries: refresh.entries,
        });
      }
    } catch (error) {
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      const message = error instanceof Error ? error.message : "No se pudo cargar la lista de espera";
      setLoadError(message);
      toastErrorOnce("waitlist-load", message);

      const cachedClasses = readStoredClassesCache();
      const cachedOverview = readStoredOverviewCache();

      if (cachedOverview && cachedOverview.classes.length > 0) {
        setClasses((previous) => (previous.length > 0 ? previous : cachedOverview.classes));
        setEntries((previous) => (previous.length > 0 ? previous : cachedOverview.entries));
        setSelectedClassId((previous) => {
          const nextSelected = previous || readStoredClassId() || cachedOverview.selectedClassId || cachedOverview.classes[0]?.classId || "";
          persistSelectedClassId(nextSelected);
          return nextSelected;
        });
      } else if (cachedClasses.length > 0) {
        setClasses((previous) => (previous.length > 0 ? previous : cachedClasses));
        setSelectedClassId((previous) => {
          const nextSelected = previous || readStoredClassId() || cachedClasses[0]?.classId || "";
          persistSelectedClassId(nextSelected);
          return nextSelected;
        });
      }
    } finally {
      if (requestId === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    persistSelectedClassId(selectedClassId);
  }, [selectedClassId]);

  useEffect(() => {
    if (classes.length === 0) {
      return;
    }

    if (selectedClassId && classes.some((item) => item.classId === selectedClassId)) {
      return;
    }

    const stored = readStoredClassId();
    if (stored && classes.some((item) => item.classId === stored)) {
      setSelectedClassId(stored);
      return;
    }

    setSelectedClassId(classes[0]?.classId || "");
  }, [classes, selectedClassId]);

  const onClassChange = async (value: string) => {
    setSelectedClassId(value);
    persistSelectedClassId(value);
    await loadData(value);
  };

  const handleOfferNext = async () => {
    if (waitlistLocked) {
      setLockOpen(true);
      return;
    }

    if (!selectedClassId) {
      toast.error("Selecciona una clase para continuar");
      return;
    }

    setProcessing(true);
    try {
      const result = await offerNextWaitlistSpot(selectedClassId);
      if (!result.offered) {
        if (result.reason === "already_offered") {
          toast.info("Ya hay una propuesta activa", {
            description: "Espera su respuesta o procesa expiraciones antes de enviar otra.",
          });
        } else {
          toast.info("No hay personas pendientes", {
            description: "Prueba otra clase o revisa nuevas solicitudes.",
          });
        }
      } else {
        toast.success("Propuesta enviada", {
          description: `Destinatario: ${result.recipient?.email || "siguiente persona disponible"}`,
        });
      }
      await loadData(selectedClassId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo ofrecer la plaza");
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessExpired = async () => {
    if (waitlistLocked) {
      setLockOpen(true);
      return;
    }

    setProcessing(true);
    try {
      const result = await processExpiredWaitlistOffers(selectedClassId || undefined);
      toast.success("Expiraciones procesadas", {
        description: `${result.expiredCount} oferta(s) actualizada(s).`,
      });
      await loadData(selectedClassId || undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron procesar expiraciones");
    } finally {
      setProcessing(false);
    }
  };

  const ENTRY_STATUS_CONFIG: Record<WaitlistEntry["status"], { label: string; className: string }> = {
    pending: { label: "En espera", className: "bg-warning/15 text-warning border-warning/20" },
    offered: { label: "Plaza ofrecida", className: "bg-primary/15 text-primary border-primary/20" },
    enrolled: { label: "Inscrito", className: "bg-success/15 text-success border-success/20" },
    expired: { label: "Oferta vencida", className: "bg-muted text-muted-foreground border-border" },
    cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
  };

  return (
    <PageContainer
      title="Lista de espera"
      description="Alumnos en espera de plaza disponible en clases completas"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfig((v) => !v)}>
            <Settings className="h-4 w-4 mr-1.5" />
            Configuración
          </Button>
          <Button
            size="sm"
            onClick={() => void handleOfferNext()}
            disabled={processing || loading || !selectedClassId || waitlistLocked}
            title="Notifica al siguiente alumno en lista que hay una plaza disponible"
          >
            {processing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            Ofrecer plaza al siguiente
          </Button>
        </div>
      }
    >
      {waitlistLocked && (
        <UpgradeFeatureAlert
          title="Lista de espera automática no disponible en tu plan"
          description={`Tu plan (${planLabel}) no incluye esta función. Mejora a Pro para gestionar la lista de espera.`}
          onUpgrade={() => void startUpgrade("waitlistAutomation")}
        />
      )}

      {/* Explicación del flujo */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">¿Cómo funciona la lista de espera?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cuando una clase está llena, las nuevas matrículas para esa clase entran en esta lista por orden de solicitud.
              Al abrirse una plaza (cancelación o baja), puedes <strong>ofrecer la plaza al siguiente de la lista</strong> — el alumno recibe un email
              con un enlace para confirmar o rechazar. Si no responde en el plazo, la oferta vence y pasa al siguiente.
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-muted-foreground">Configura si las clases llenas se muestran en el formulario de matrícula →</span>
              <button
                type="button"
                onClick={() => navigate("/admin/settings/escuela")}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
              >
                Configuración de matrícula <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración */}
      {showConfig && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" /> Configuración de la lista de espera
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Procesamiento automático</p>
                <p className="text-xs text-muted-foreground">Cuando se libere una plaza, notifica automáticamente al siguiente de la lista sin intervención manual.</p>
              </div>
              <Switch
                checked={autoProcess}
                onCheckedChange={(v) => {
                  setAutoProcess(v);
                  window.localStorage.setItem("nexa:waitlist:auto-process", v ? "1" : "0");
                  toast.success(v ? "Procesamiento automático activado" : "Asignación manual activada");
                }}
              />
            </div>
            {!autoProcess && (
              <p className="text-xs text-muted-foreground px-1">
                En modo manual, recibirás una notificación cuando haya una plaza disponible y serás tú quien ofrezca la plaza al alumno de forma manual desde esta pantalla.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Selector de clase + stats */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Clase</p>
            {loading && classes.length === 0 ? (
              <Skeleton className="h-9 w-full max-w-sm" />
            ) : classes.length > 0 ? (
              <Select value={selectedClassId} onValueChange={(v) => void onClassChange(v)}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Selecciona una clase" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((item) => (
                    <SelectItem key={item.classId} value={item.classId}>
                      {item.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">No hay clases con lista de espera.</p>
            )}
          </div>

          {selectedClass && (
            <div className="flex gap-3 text-center">
              <div className="rounded-lg border border-border px-4 py-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ocupación</p>
                <p className="text-lg font-bold text-foreground">{selectedClass.confirmedEnrollments}/{selectedClass.capacity}</p>
              </div>
              <div className="rounded-lg border border-border px-4 py-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">En espera</p>
                <p className="text-lg font-bold text-warning">{selectedClass.pendingWaitlist}</p>
              </div>
              <div className="rounded-lg border border-border px-4 py-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Con oferta</p>
                <p className="text-lg font-bold text-primary">{selectedClass.offeredWaitlist}</p>
              </div>
            </div>
          )}
        </div>

        {loadError && !loading && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {loadError} —{" "}
            <button type="button" onClick={() => void loadData()} className="underline">Reintentar</button>
          </div>
        )}
      </div>

      {/* Entry list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              {entries.length > 0 ? `${entries.length} persona${entries.length !== 1 ? "s" : ""} en lista` : "Lista de espera"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => void handleProcessExpired()}
            disabled={processing || loading}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Procesar vencidas
          </Button>
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-success/60 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Sin personas en lista</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedClassId
                ? "No hay solicitudes en espera para esta clase."
                : "Selecciona una clase para ver su lista."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry, idx) => {
              const statusCfg = ENTRY_STATUS_CONFIG[entry.status];
              return (
                <div key={entry.id} className="px-5 py-4 flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.email}{entry.phone ? ` · ${entry.phone}` : ""}</p>
                    {entry.expiresAt && entry.status === "offered" && (
                      <p className="text-[11px] text-warning flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        Oferta vence: {new Date(entry.expiresAt).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn("text-[10px] font-medium", statusCfg.className)}>
                      {statusCfg.label}
                    </Badge>
                    {entry.email && (
                      <a
                        href={`mailto:${entry.email}?subject=${encodeURIComponent("Lista de espera — Nexa")}`}
                        title="Contactar por email"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FeatureLockDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title="Función disponible en plan Pro"
        description="La automatización de lista de espera está bloqueada en tu plan actual."
        onUpgrade={() => void startUpgrade("waitlistAutomation")}
      />
    </PageContainer>
  );
}
