import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModuleHelpShortcut } from "@/components/layout/ModuleHelpShortcut";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createRenewalCampaign,
  getRenewalCampaigns,
  getRenewalOffers,
  updateRenewalOffer,
  type RenewalCampaign,
  type RenewalOffer,
  type RenewalOfferStatus,
} from "@/lib/api/renewals";
import { runWithRetry } from "@/lib/reliability";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { UpgradeFeatureAlert } from "@/components/billing/UpgradeFeatureAlert";
import { FeatureLockDialog } from "@/components/billing/FeatureLockDialog";

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

const RENEWALS_SELECTED_CAMPAIGN_KEY = "nexa:renewals:selected-campaign";
const RENEWALS_STATUS_FILTER_KEY = "nexa:renewals:status-filter";
const RENEWALS_CAMPAIGNS_CACHE_KEY = "nexa:renewals:campaigns-cache";

function readStoredString(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || "";
}

function readStoredStatusFilter(): "all" | RenewalOfferStatus {
  const stored = readStoredString(RENEWALS_STATUS_FILTER_KEY);
  return stored === "pending" || stored === "confirmed" || stored === "changed" || stored === "released" ? stored : "all";
}

function readStoredCampaignsCache(): RenewalCampaign[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RENEWALS_CAMPAIGNS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RenewalCampaign[]) : [];
  } catch {
    return [];
  }
}

function persistString(key: string, value: string): void {
  if (typeof window === "undefined") return;

  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, value);
}

function persistCampaignsCache(campaigns: RenewalCampaign[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RENEWALS_CAMPAIGNS_CACHE_KEY, JSON.stringify(campaigns));
}

function isValidPeriodCode(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export default function RenewalsPage() {
  const { billing, planLabel, startUpgrade, loading: billingLoading } = useBillingEntitlements();
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<RenewalCampaign[]>(() => readStoredCampaignsCache());
  const [offers, setOffers] = useState<RenewalOffer[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(() => readStoredString(RENEWALS_SELECTED_CAMPAIGN_KEY));
  const [statusFilter, setStatusFilter] = useState<"all" | RenewalOfferStatus>(() => readStoredStatusFilter());

  const [campaignName, setCampaignName] = useState("");
  const [fromPeriod, setFromPeriod] = useState("");
  const [toPeriod, setToPeriod] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const renewalsLocked = !billingLoading && !billing.features.renewalAutomation;

  const campaignNameTrimmed = campaignName.trim();
  const fromPeriodTrimmed = fromPeriod.trim();
  const toPeriodTrimmed = toPeriod.trim();

  const createValidationError = useMemo(() => {
    if (!campaignNameTrimmed) {
      return "El nombre de la campaña es obligatorio.";
    }

    if (!fromPeriodTrimmed || !toPeriodTrimmed) {
      return "Periodo origen y periodo destino son obligatorios.";
    }

    if (!isValidPeriodCode(fromPeriodTrimmed) || !isValidPeriodCode(toPeriodTrimmed)) {
      return "Usa formato AAAA-MM en ambos periodos.";
    }

    if (fromPeriodTrimmed === toPeriodTrimmed) {
      return "El periodo destino debe ser distinto del periodo origen.";
    }

    if (fromPeriodTrimmed > toPeriodTrimmed) {
      return "El periodo destino debe ser posterior al periodo origen.";
    }

    return null;
  }, [campaignNameTrimmed, fromPeriodTrimmed, toPeriodTrimmed]);

  const canCreateCampaign = !mutating && !loadingCampaigns && !renewalsLocked && !createValidationError;

  const setCampaignsPersisted = (nextCampaigns: RenewalCampaign[]) => {
    setCampaigns(nextCampaigns);
    persistCampaignsCache(nextCampaigns);
  };

  const setSelectedCampaignIdPersisted = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    persistString(RENEWALS_SELECTED_CAMPAIGN_KEY, campaignId);
  };

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    setCampaignsError(null);
    try {
      const data = await getRenewalCampaigns();
      setCampaignsPersisted(data);

      setSelectedCampaignId((previous) => {
        if (previous && data.some((campaign) => campaign.id === previous)) {
          return previous;
        }

        const storedCampaignId = readStoredString(RENEWALS_SELECTED_CAMPAIGN_KEY);
        if (storedCampaignId && data.some((campaign) => campaign.id === storedCampaignId)) {
          return storedCampaignId;
        }

        return data[0]?.id || "";
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar las campañas";
      setCampaignsError(message);
      toast.error(message);

      const cached = readStoredCampaignsCache();
      if (cached.length > 0) {
        setCampaigns((previous) => previous.length > 0 ? previous : cached);
        setSelectedCampaignId((previous) => {
          if (previous && cached.some((campaign) => campaign.id === previous)) {
            return previous;
          }

          const storedCampaignId = readStoredString(RENEWALS_SELECTED_CAMPAIGN_KEY);
          if (storedCampaignId && cached.some((campaign) => campaign.id === storedCampaignId)) {
            return storedCampaignId;
          }

          return cached[0]?.id || previous;
        });
      }
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadOffers = async (campaignId: string, filter: "all" | RenewalOfferStatus) => {
    if (!campaignId) {
      setOffers([]);
      return;
    }

    setLoadingOffers(true);
    setOffersError(null);
    try {
      const data = await getRenewalOffers(campaignId, filter === "all" ? undefined : filter);
      setOffers(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar las ofertas";
      setOffersError(message);
      toast.error(message);
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedCampaignId) {
      window.localStorage.removeItem(RENEWALS_SELECTED_CAMPAIGN_KEY);
      return;
    }
    window.localStorage.setItem(RENEWALS_SELECTED_CAMPAIGN_KEY, selectedCampaignId);
  }, [selectedCampaignId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RENEWALS_STATUS_FILTER_KEY, statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    void loadOffers(selectedCampaignId, statusFilter);
  }, [selectedCampaignId, statusFilter]);

  useEffect(() => {
    if (campaigns.length === 0) {
      if (selectedCampaignId) {
        setSelectedCampaignId("");
      }
      return;
    }

    if (selectedCampaignId && campaigns.some((campaign) => campaign.id === selectedCampaignId)) {
      return;
    }

    const storedCampaignId = readStoredString(RENEWALS_SELECTED_CAMPAIGN_KEY);
    if (storedCampaignId && campaigns.some((campaign) => campaign.id === storedCampaignId)) {
      setSelectedCampaignId(storedCampaignId);
      return;
    }

    setSelectedCampaignId(campaigns[0]?.id || "");
  }, [campaigns, selectedCampaignId]);

  const handleCreateCampaign = async () => {
    if (renewalsLocked) {
      setLockOpen(true);
      return;
    }

    if (createValidationError) {
      setCreateError(createValidationError);
      toast.error(createValidationError);
      return;
    }

    setMutating(true);
    setCreateError(null);
    try {
      const result = await createRenewalCampaign({
        name: campaignNameTrimmed,
        fromPeriod: fromPeriodTrimmed,
        toPeriod: toPeriodTrimmed,
        expiresAt: expiresAt || undefined,
      });

      toast.success(`Campaña creada con ${result.offersCount} propuesta(s)`);
      setCampaignName("");
      setFromPeriod("");
      setToPeriod("");
      setExpiresAt("");

      const refreshedCampaigns = await runWithRetry(async () => {
        const data = await getRenewalCampaigns();
        if (!data.some((campaign) => campaign.id === result.campaignId)) {
          throw new Error("La campaña aún se está sincronizando");
        }
        return data;
      }, { retries: 2, delayMs: 350 });

      setCampaignsPersisted(refreshedCampaigns);
      setSelectedCampaignIdPersisted(result.campaignId);
      await loadOffers(result.campaignId, statusFilter);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la campaña";
      setCreateError(message);
      toast.error(message);
    } finally {
      setMutating(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: "confirm" | "release") => {
    if (renewalsLocked) {
      setLockOpen(true);
      return;
    }

    if (!selectedCampaignId) {
      return;
    }

    setMutating(true);
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
      setMutating(false);
    }
  };

  return (
    <PageContainer
      title="Renovación de alumnos"
      description="Gestiona propuestas de continuidad por periodo de forma simple"
      actions={
        <>
          <ModuleHelpShortcut module="renewals" />
          <Button variant="outline" onClick={() => void loadCampaigns()} disabled={loadingCampaigns || loadingOffers || mutating}>
            {loadingCampaigns ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Recargar</span>
          </Button>
        </>
      }
    >
      {renewalsLocked ? (
        <UpgradeFeatureAlert
          title="Renovaciones automáticas bloqueadas"
          description={`Tu plan actual (${planLabel}) no incluye campañas automáticas de renovación. Mejora a Pro para activarlas.`}
          onUpgrade={() => void startUpgrade("renewalAutomation")}
        />
      ) : null}

      <div className={renewalsLocked ? "pointer-events-none opacity-70 blur-[1px]" : ""}>

      {campaignsError && campaigns.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              type="error"
              title="No se pudieron cargar campañas"
              description={campaignsError}
              actionLabel="Reintentar"
              onAction={() => void loadCampaigns()}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Crear campaña</CardTitle>
          <CardDescription>Genera propuestas para los alumnos activos del periodo origen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Nombre</Label>
            <Input
              value={campaignName}
              onChange={(event) => {
                setCampaignName(event.target.value);
                if (createError) setCreateError(null);
              }}
              placeholder="Renovación abril"
              aria-invalid={Boolean(createError || createValidationError) && !campaignNameTrimmed}
            />
          </div>
          <div className="space-y-2">
            <Label>Periodo origen</Label>
            <Input
              value={fromPeriod}
              onChange={(event) => {
                setFromPeriod(event.target.value);
                if (createError) setCreateError(null);
              }}
              placeholder="2026-03"
              aria-invalid={Boolean(createError || createValidationError) && (!fromPeriodTrimmed || !isValidPeriodCode(fromPeriodTrimmed))}
            />
          </div>
          <div className="space-y-2">
            <Label>Periodo destino</Label>
            <Input
              value={toPeriod}
              onChange={(event) => {
                setToPeriod(event.target.value);
                if (createError) setCreateError(null);
              }}
              placeholder="2026-04"
              aria-invalid={Boolean(createError || createValidationError) && (!toPeriodTrimmed || !isValidPeriodCode(toPeriodTrimmed) || fromPeriodTrimmed >= toPeriodTrimmed)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Fecha límite (opcional)</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button onClick={handleCreateCampaign} disabled={!canCreateCampaign}>
              {mutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear campaña
            </Button>
          </div>
          <div className="md:col-span-4">
            {createError ? (
              <p className="text-sm text-destructive">{createError}</p>
            ) : createValidationError ? (
              <p className="text-xs text-muted-foreground">{createValidationError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Listo para crear la campaña con validación completa.</p>
            )}
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
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignIdPersisted}>
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
            {!loadingCampaigns && campaigns.length === 0 ? (
              <div className="pt-2">
                <EmptyState
                  title="Aún no hay campañas"
                  description="Crea la primera campaña para preparar propuestas de continuidad automáticamente."
                />
              </div>
            ) : null}
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
          {loadingOffers ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : offersError ? (
            <EmptyState
              type="error"
              title="No se pudieron cargar propuestas"
              description={offersError}
              actionLabel="Reintentar"
              onAction={() => void loadOffers(selectedCampaignId, statusFilter)}
            />
          ) : offers.length === 0 ? (
            <EmptyState
              title="Sin propuestas para este filtro"
              description="Cambia el estado o selecciona otra campaña para recuperar resultados rápidamente."
              actionLabel="Ver todas"
              onAction={() => setStatusFilter("all")}
            />
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
                        disabled={mutating || loadingOffers || offer.status !== "pending"}
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleOfferAction(offer.id, "release")}
                        disabled={mutating || loadingOffers || offer.status === "released"}
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
      </div>

      <FeatureLockDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title="Renovaciones disponibles en plan Pro"
        description="Para crear campañas y confirmar propuestas necesitas activar el módulo de renovaciones automáticas en un plan superior."
        onUpgrade={() => void startUpgrade("renewalAutomation")}
      />
    </PageContainer>
  );
}
