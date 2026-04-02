import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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

  return (
    <div className="space-y-6">
      {waitlistLocked ? (
        <UpgradeFeatureAlert
          title="Lista de espera automatizada no disponible"
          description={`Tu plan actual (${planLabel}) no incluye esta automatización. Mejora a Pro para enviar ofertas y procesar expiraciones automáticamente.`}
          onUpgrade={() => void startUpgrade("waitlistAutomation")}
        />
      ) : null}

      <div className={waitlistLocked ? "pointer-events-none opacity-70 blur-[1px]" : ""}>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lista de espera</h1>
          <p className="text-muted-foreground">Gestiona solicitudes por clase y envía propuestas de plaza disponibles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleProcessExpired} disabled={processing || loading}>
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Procesar expiradas
          </Button>
          <Button onClick={handleOfferNext} disabled={processing || loading || !selectedClassId}>
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar propuesta de plaza
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clase</CardTitle>
          <CardDescription>Selecciona la clase para ver su lista y gestionar propuestas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && loadError ? (
            <EmptyState
              type="error"
              title="No se pudo sincronizar la lista de espera"
              description={loadError}
              actionLabel="Reintentar"
              onAction={() => void loadData(selectedClassId || undefined)}
            />
          ) : null}

          {classes.length > 0 ? (
            <Select value={selectedClassId} onValueChange={onClassChange}>
              <SelectTrigger>
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
          ) : null}

          {!loading && classes.length === 0 ? (
            <EmptyState
              type="classes"
              title="No hay clases con lista de espera"
              description="Crea o activa clases para empezar a recibir solicitudes en espera y gestionarlas desde aquí."
              actionLabel="Ir a Clases"
              onAction={() => navigate("/admin/classes")}
            />
          ) : null}

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-3 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : selectedClass ? (
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Cupos confirmados</div>
                <div className="text-xl font-semibold">{selectedClass.confirmedEnrollments} / {selectedClass.capacity}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Pendientes</div>
                <div className="text-xl font-semibold">{selectedClass.pendingWaitlist}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Ofertas activas</div>
                <div className="text-xl font-semibold">{selectedClass.offeredWaitlist}</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      </div>

      <FeatureLockDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title="Función disponible en plan Pro"
        description="La automatización de lista de espera está bloqueada en tu plan actual. Puedes mejorar el plan para habilitarla ahora mismo."
        onUpgrade={() => void startUpgrade("waitlistAutomation")}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista actual</CardTitle>
          <CardDescription>
            {entries.length === 0 ? "No hay personas en lista de espera para esta clase." : `${entries.length} persona(s) en lista`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Sincronizando lista de espera y estado de propuestas...</p>
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              title="Sin personas en lista"
              description="Cuando se registren solicitudes en esta clase, aparecerán aquí para enviar propuestas de plaza."
              actionLabel={selectedClassId ? "Enviar propuesta de plaza" : undefined}
              onAction={selectedClassId ? () => void handleOfferNext() : undefined}
            />
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">#{entry.position} · {entry.name}</p>
                      <p className="text-sm text-muted-foreground">{entry.email}{entry.phone ? ` · ${entry.phone}` : ""}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{WAITLIST_STATUS_LABELS[entry.status]}</p>
                      {entry.expiresAt ? <p className="text-muted-foreground">Expira: {new Date(entry.expiresAt).toLocaleString()}</p> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
