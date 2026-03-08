import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createRenewalCampaign,
  getRenewalCampaigns,
  getRenewalOffers,
  updateRenewalOffer,
  type RenewalCampaign,
  type RenewalOffer,
  type RenewalOfferStatus,
} from "@/lib/api/renewals";

const OFFER_STATUS_FILTERS: Array<{ value: "all" | RenewalOfferStatus; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "changed", label: "Con cambios" },
  { value: "released", label: "Liberadas" },
];

const OFFER_STATUS_LABELS: Record<RenewalOfferStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  changed: "Con cambios",
  released: "Plaza liberada",
};

export default function RenewalsPage() {
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [campaigns, setCampaigns] = useState<RenewalCampaign[]>([]);
  const [offers, setOffers] = useState<RenewalOffer[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RenewalOfferStatus>("all");

  const [campaignName, setCampaignName] = useState("");
  const [fromPeriod, setFromPeriod] = useState("");
  const [toPeriod, setToPeriod] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const data = await getRenewalCampaigns();
      setCampaigns(data);
      setSelectedCampaignId((previous) => previous || data[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las campañas");
      setCampaigns([]);
      setSelectedCampaignId("");
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadOffers = async (campaignId: string, filter: "all" | RenewalOfferStatus) => {
    if (!campaignId) {
      setOffers([]);
      return;
    }

    setProcessing(true);
    try {
      const data = await getRenewalOffers(campaignId, filter === "all" ? undefined : filter);
      setOffers(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las ofertas");
      setOffers([]);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    void loadOffers(selectedCampaignId, statusFilter);
  }, [selectedCampaignId, statusFilter]);

  const handleCreateCampaign = async () => {
    if (!campaignName.trim() || !fromPeriod || !toPeriod) {
      toast.error("Nombre, periodo origen y periodo destino son obligatorios");
      return;
    }

    setProcessing(true);
    try {
      const result = await createRenewalCampaign({
        name: campaignName.trim(),
        fromPeriod,
        toPeriod,
        expiresAt: expiresAt || undefined,
      });

      toast.success(`Campaña creada con ${result.offersCount} propuesta(s)`);
      setCampaignName("");
      setFromPeriod("");
      setToPeriod("");
      setExpiresAt("");
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la campaña");
    } finally {
      setProcessing(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: "confirm" | "release") => {
    if (!selectedCampaignId) {
      return;
    }

    setProcessing(true);
    try {
      await updateRenewalOffer({
        campaignId: selectedCampaignId,
        offerId,
        action,
      });
      toast.success(action === "confirm" ? "Renovación confirmada" : "Plaza liberada");
      await loadOffers(selectedCampaignId, statusFilter);
      await loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la oferta");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PageContainer
      title="Renovación de alumnos"
      description="Gestiona propuestas de continuidad por periodo de forma simple"
      actions={
        <Button variant="outline" onClick={() => void loadCampaigns()} disabled={loadingCampaigns || processing}>
          {loadingCampaigns ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Recargar</span>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Crear campaña</CardTitle>
          <CardDescription>Genera propuestas para los alumnos activos del periodo origen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Nombre</Label>
            <Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Renovación abril" />
          </div>
          <div className="space-y-2">
            <Label>Periodo origen</Label>
            <Input value={fromPeriod} onChange={(event) => setFromPeriod(event.target.value)} placeholder="2026-03" />
          </div>
          <div className="space-y-2">
            <Label>Periodo destino</Label>
            <Input value={toPeriod} onChange={(event) => setToPeriod(event.target.value)} placeholder="2026-04" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Fecha limite (opcional)</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button onClick={handleCreateCampaign} disabled={processing || loadingCampaigns}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear campaña
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campañas</CardTitle>
          <CardDescription>Selecciona una campaña para gestionar sus propuestas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>Campaña activa</Label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una campaña" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.fromPeriod} a {campaign.toPeriod})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | RenewalOfferStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                {OFFER_STATUS_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCampaign ? (
            <div className="md:col-span-3 grid gap-3 sm:grid-cols-5 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Total</div>
                <div className="text-xl font-semibold">{selectedCampaign.counts.total}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Pendientes</div>
                <div className="text-xl font-semibold">{selectedCampaign.counts.pending}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Confirmadas</div>
                <div className="text-xl font-semibold">{selectedCampaign.counts.confirmed}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Con cambios</div>
                <div className="text-xl font-semibold">{selectedCampaign.counts.changed}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Liberadas</div>
                <div className="text-xl font-semibold">{selectedCampaign.counts.released}</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Propuestas de renovación</CardTitle>
          <CardDescription>
            {offers.length === 0 ? "No hay propuestas para los filtros actuales." : `${offers.length} propuesta(s) en pantalla`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processing ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : offers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos para mostrar.</p>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => (
                <div key={offer.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{offer.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {offer.studentEmail || "Sin email"} · estado: {OFFER_STATUS_LABELS[offer.status]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Clases actuales: {offer.currentClassIds.length} · clases propuestas: {offer.proposedClassIds.length}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleOfferAction(offer.id, "confirm")}
                        disabled={processing || offer.status !== "pending"}
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleOfferAction(offer.id, "release")}
                        disabled={processing || offer.status === "released"}
                      >
                        Liberar plaza
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
