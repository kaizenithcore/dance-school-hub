import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getClasses } from "@/lib/api/classes";
import { getDisciplines } from "@/lib/api/disciplines";
import {
  cancelQueuedCampaignDeliveries,
  getCampaignDeliveries,
  getEmailCampaigns,
  previewEmailAudience,
  queueEmailCampaign,
  tickJobs,
  type AudienceType,
  type CommunicationChannel,
  type DeliveryRecord,
} from "@/lib/api/communications";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { UpgradeFeatureAlert } from "@/components/billing/UpgradeFeatureAlert";
import { FeatureLockDialog } from "@/components/billing/FeatureLockDialog";
import { toast } from "sonner";

type ClassItem = { id: string; name: string };
type DisciplineItem = { id: string; name: string };

const AUDIENCE_LABELS: Record<AudienceType, string> = {
  all: "Toda la escuela",
  class: "Por clase",
  discipline: "Por disciplina",
};

const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: "Email",
  whatsapp_link: "WhatsApp (enlace)",
};

const DELIVERY_STATUS_LABELS: Record<DeliveryRecord["status"], string> = {
  queued: "En cola",
  processing: "Procesando",
  ready: "Listo",
  sent: "Enviado",
  failed: "Error",
  skipped: "Omitido",
};

export default function CommunicationsPage() {
  const { billing, planLabel, startUpgrade, loading: billingLoading } = useBillingEntitlements();
  const [channel, setChannel] = useState<CommunicationChannel>("email");
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [classId, setClassId] = useState("");
  const [disciplineId, setDisciplineId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [disciplines, setDisciplines] = useState<DisciplineItem[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; createdAt: string; channel: CommunicationChannel; audience: { type: AudienceType }; subject: string; status: "queued" | "processing" | "ready" | "sent" | "partial" | "failed"; queuedCount: number; sentCount: number; failedCount: number }>>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [cancellingQueue, setCancellingQueue] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);

  const communicationLocked = !billingLoading && !billing.features.massCommunicationEmail;

  const canSubmit = useMemo(() => {
    if (!subject.trim() || !message.trim()) return false;
    if (audienceType === "class" && !classId) return false;
    if (audienceType === "discipline" && !disciplineId) return false;
    return true;
  }, [audienceType, classId, disciplineId, message, subject]);

  const activeCampaignsCount = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "queued" || campaign.status === "processing").length,
    [campaigns]
  );
  const totalSentCount = useMemo(
    () => campaigns.reduce((sum, campaign) => sum + campaign.sentCount, 0),
    [campaigns]
  );
  const totalFailedCount = useMemo(
    () => campaigns.reduce((sum, campaign) => sum + campaign.failedCount, 0),
    [campaigns]
  );

  const buildAudience = () => ({
    type: audienceType,
    classId: audienceType === "class" ? classId : undefined,
    disciplineId: audienceType === "discipline" ? disciplineId : undefined,
  });

  const loadMeta = async () => {
    try {
      const [classesData, disciplinesData, campaignData] = await Promise.all([
        getClasses(),
        getDisciplines(),
        getEmailCampaigns(),
      ]);
      setClasses((classesData || []).map((item) => ({ id: item.id, name: item.name })));
      setDisciplines((disciplinesData || []).map((item) => ({ id: item.id, name: item.name })));
      setCampaigns(campaignData || []);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar la configuración de comunicación");
    }
  };

  useEffect(() => {
    void loadMeta();
  }, []);

  const handlePreview = async () => {
    if (communicationLocked) {
      setLockOpen(true);
      return;
    }

    if (!canSubmit) {
      toast.error("Completa asunto, mensaje y audiencia");
      return;
    }

    setPreviewing(true);
    try {
      const result = await previewEmailAudience({
        channel,
        audience: buildAudience(),
        subject,
        message,
      });
      setPreviewCount(result.recipientsCount);
      toast.success(`Se enviará a ${result.recipientsCount} destinatarios`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo calcular el público");
    } finally {
      setPreviewing(false);
    }
  };

  const handleQueue = async () => {
    if (communicationLocked) {
      setLockOpen(true);
      return;
    }

    if (!canSubmit) {
      toast.error("Completa asunto, mensaje y audiencia");
      return;
    }

    setSending(true);
    try {
      const result = await queueEmailCampaign({
        channel,
        audience: buildAudience(),
        subject,
        message,
      });
      toast.success(
        channel === "email"
          ? `Envío preparado para ${result.queuedCount} destinatarios`
          : `Campaña de WhatsApp lista para ${result.queuedCount} destinatarios`
      );
      setPreviewCount(result.queuedCount);
      await loadMeta();
      setSelectedCampaignId(result.campaignId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo preparar el envío");
    } finally {
      setSending(false);
    }
  };

  const handleProcessQueue = async () => {
    if (communicationLocked) {
      setLockOpen(true);
      return;
    }

    setProcessingQueue(true);
    try {
      const result = await tickJobs(50);
      toast.success(`Envíos realizados: ${result.sent}. Con error: ${result.failed}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron completar los envíos pendientes");
    } finally {
      setProcessingQueue(false);
    }
  };

  const loadDeliveries = async (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setLoadingDeliveries(true);
    try {
      const rows = await getCampaignDeliveries(campaignId);
      setDeliveries(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el detalle del envío");
      setDeliveries([]);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleCancelQueued = async () => {
    if (!selectedCampaignId) {
      toast.error("Selecciona una campaña para eliminar su cola");
      return;
    }

    setCancellingQueue(true);
    try {
      const result = await cancelQueuedCampaignDeliveries(selectedCampaignId);
      toast.success(`Mensajes en cola eliminados: ${result.cancelledCount}`);
      await loadMeta();
      await loadDeliveries(selectedCampaignId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron eliminar los mensajes en cola");
    } finally {
      setCancellingQueue(false);
    }
  };

  return (
    <PageContainer
      title="Comunicados"
      description="Comunicación masiva clara y enfocada a resultados"
      actions={
        <Button variant="outline" onClick={() => void handleProcessQueue()} disabled={processingQueue}>
          {processingQueue ? "Enviando..." : "Enviar pendientes"}
        </Button>
      }
    >
      {communicationLocked ? (
        <UpgradeFeatureAlert
          title="Comunicación masiva por email bloqueada"
          description={`Tu plan actual (${planLabel}) no incluye campañas masivas. Mejora a Pro para habilitar esta función.`}
          onUpgrade={() => void startUpgrade("massCommunicationEmail")}
        />
      ) : null}

      <section className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Todo conectado. Todo bajo control.</p>
        <p className="mt-1 text-xs text-muted-foreground">Prepara campañas, valida audiencia y ejecuta envíos sin ruido operativo.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Campañas activas</p>
            <p className="text-lg font-semibold text-foreground">{activeCampaignsCount}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Mensajes enviados</p>
            <p className="text-lg font-semibold text-foreground">{totalSentCount}</p>
          </div>
          <div className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Errores acumulados</p>
            <p className="text-lg font-semibold text-foreground">{totalFailedCount}</p>
          </div>
        </div>
      </section>

      <div className={communicationLocked ? "pointer-events-none opacity-70 blur-[1px]" : ""}>

      <div className="rounded-lg border border-border bg-card p-5 shadow-soft space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Canal</Label>
            <Select value={channel} onValueChange={(value) => setChannel(value as CommunicationChannel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp_link">WhatsApp (enlace)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Audiencia</Label>
            <Select value={audienceType} onValueChange={(v) => setAudienceType(v as AudienceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda la escuela</SelectItem>
                <SelectItem value="class">Una clase</SelectItem>
                <SelectItem value="discipline">Una disciplina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {audienceType === "class" && (
            <div className="space-y-1.5">
              <Label>Clase</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Selecciona clase" /></SelectTrigger>
                <SelectContent>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {audienceType === "discipline" && (
            <div className="space-y-1.5">
              <Label>Disciplina</Label>
              <Select value={disciplineId} onValueChange={setDisciplineId}>
                <SelectTrigger><SelectValue placeholder="Selecciona disciplina" /></SelectTrigger>
                <SelectContent>
                  {disciplines.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Asunto</Label>
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ej: Aviso de cambio de horario" />
        </div>

        <div className="space-y-1.5">
          <Label>Mensaje</Label>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            placeholder="Escribe aquí el mensaje para alumnos/familias"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void handlePreview()} disabled={previewing || !canSubmit || communicationLocked}>
            {previewing ? "Calculando..." : "Ver destinatarios"}
          </Button>
          <Button onClick={() => void handleQueue()} disabled={sending || !canSubmit || communicationLocked}>
            {sending ? "Preparando..." : "Preparar envío"}
          </Button>
          {previewCount !== null ? <Badge variant="secondary">{previewCount} destinatarios</Badge> : null}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold text-foreground mb-3">Historial reciente</h3>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aun no tienes envios registrados. Cuando prepares el primero, aparecera aqui.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void loadDeliveries(item.id)}
                className="w-full rounded-md border border-border px-3 py-2 text-left hover:bg-muted"
              >
                <p className="text-sm font-medium">{item.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString("es-ES")} · canal: {CHANNEL_LABELS[item.channel]} · público: {AUDIENCE_LABELS[item.audience.type]} · total: {item.queuedCount} · enviados: {item.sentCount} · error: {item.failedCount} · estado: {item.status}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Estado por destinatario</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCancelQueued()}
            disabled={!selectedCampaignId || cancellingQueue}
          >
            {cancellingQueue ? "Eliminando cola..." : "Eliminar mensajes en cola"}
          </Button>
        </div>
        {!selectedCampaignId ? (
          <p className="text-sm text-muted-foreground">Selecciona una campana para ver el detalle de entrega por destinatario.</p>
        ) : loadingDeliveries ? (
          <p className="text-sm text-muted-foreground">Estamos cargando el detalle de entregas...</p>
        ) : deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Esta campana no tiene destinatarios para mostrar con los filtros actuales.</p>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="rounded-md border border-border px-3 py-2">
                <p className="text-sm font-medium">{delivery.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {delivery.email || delivery.phone || "Sin contacto"} · estado: {DELIVERY_STATUS_LABELS[delivery.status]}
                </p>
                {delivery.waLink ? (
                  <a
                    href={delivery.waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Abrir enlace de WhatsApp
                  </a>
                ) : null}
                {delivery.errorMessage ? (
                  <p className="text-xs text-destructive">{delivery.errorMessage}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      <FeatureLockDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title="Comunicación masiva disponible en plan Pro"
        description="Para crear campañas de email por audiencia necesitas un plan superior. Puedes actualizarlo en segundos."
        onUpgrade={() => void startUpgrade("massCommunicationEmail")}
      />
    </PageContainer>
  );
}
