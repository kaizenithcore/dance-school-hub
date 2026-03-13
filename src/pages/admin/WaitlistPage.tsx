import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const WAITLIST_STATUS_LABELS: Record<WaitlistEntry["status"], string> = {
  pending: "Pendiente",
  offered: "Oferta enviada",
  enrolled: "Inscrito",
  expired: "Vencida",
  cancelled: "Cancelada",
};

export default function WaitlistPage() {
  const { billing, planLabel, startUpgrade, loading: billingLoading } = useBillingEntitlements();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [classes, setClasses] = useState<WaitlistClassQueue[]>([]);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const waitlistLocked = !billingLoading && !billing.features.waitlistAutomation;

  const selectedClass = useMemo(
    () => classes.find((item) => item.classId === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const loadData = async (nextClassId?: string) => {
    setLoading(true);
    try {
      const response = await getWaitlistOverview(nextClassId || selectedClassId || undefined);
      setClasses(response.classes);
      setEntries(response.entries);

      const fallbackClassId =
        response.selectedClassId || nextClassId || selectedClassId || response.classes[0]?.classId || "";
      setSelectedClassId(fallbackClassId);

      if (!response.selectedClassId && fallbackClassId && fallbackClassId !== nextClassId) {
        const refresh = await getWaitlistOverview(fallbackClassId);
        setEntries(refresh.entries);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la lista de espera");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClassChange = async (value: string) => {
    setSelectedClassId(value);
    await loadData(value);
  };

  const handleOfferNext = async () => {
    if (waitlistLocked) {
      setLockOpen(true);
      return;
    }

    if (!selectedClassId) {
      toast.error("Selecciona una clase");
      return;
    }

    setProcessing(true);
    try {
      const result = await offerNextWaitlistSpot(selectedClassId);
      if (!result.offered) {
        if (result.reason === "already_offered") {
          toast.info("Ya hay una propuesta activa para esta clase");
        } else {
          toast.info("No hay personas pendientes en la lista");
        }
      } else {
        toast.success(`Propuesta enviada a ${result.recipient?.email || "la siguiente persona"}`);
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
      toast.success(`Expiraciones procesadas: ${result.expiredCount}`);
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

          {selectedClass ? (
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
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos para mostrar.</p>
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
