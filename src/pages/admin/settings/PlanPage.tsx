import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CreditCard, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { redirectToBillingCheckout } from "@/lib/api/stripe";
import type { BillingCycle } from "@/lib/api/stripe";
import { useSearchParams } from "react-router-dom";
import {
  formatAnnualFinancingLabel, planCatalog, planOrder, subscriptionAddonCatalog, type PlanType,
} from "@/lib/commercialCatalog";
import { FieldGroup, SectionHeader, SwitchRow } from "./_shared";

interface BillingState {
  planType: string; billingCycle: BillingCycle; extraStudentBlocks: number;
  addons: { customDomain: boolean; prioritySupport: boolean };
  limits: { includedActiveStudents: number; maxActiveStudents: number };
  pricing: { monthlyPriceEur: number; extraStudentsBlockSize: number; extraStudentsBlockPriceEur: number; addons: { customDomain: number; prioritySupport: number } };
}

const DEFAULT_PLAN: PlanType = planOrder[0] ?? "starter";

function resolvePlan(value: string): PlanType {
  return planOrder.includes(value as PlanType) ? (value as PlanType) : DEFAULT_PLAN;
}

function buildDefaultBilling(): BillingState {
  const plan = planCatalog[DEFAULT_PLAN];
  return {
    planType: DEFAULT_PLAN,
    billingCycle: "annual",
    extraStudentBlocks: 0,
    addons: { customDomain: false, prioritySupport: false },
    limits: { includedActiveStudents: plan.limits.includedActiveStudents, maxActiveStudents: plan.limits.includedActiveStudents },
    pricing: {
      monthlyPriceEur: plan.billing.monthlyPriceEur,
      extraStudentsBlockSize: plan.extraStudentBlocks.size,
      extraStudentsBlockPriceEur: plan.extraStudentBlocks.monthlyPriceEur,
      addons: {
        customDomain: subscriptionAddonCatalog.customDomain.monthlyPriceEur,
        prioritySupport: subscriptionAddonCatalog.prioritySupport.monthlyPriceEur,
      },
    },
  };
}

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billing, setBilling] = useState<BillingState>(buildDefaultBilling);
  const [savedSnapshot, setSavedSnapshot] = useState<BillingState>(buildDefaultBilling);
  const [fullSnapshot, setFullSnapshot] = useState<Record<string, unknown>>({});
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<PlanType>(DEFAULT_PLAN);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSchoolSettings();
      if (!data) { toast.error("No se pudo cargar la configuración"); return; }
      const b = data.billing as Record<string, unknown> | undefined;
      if (b) {
        const addons = (b.addons || {}) as Record<string, unknown>;
        const limits = (b.limits || {}) as Record<string, unknown>;
        const pricing = (b.pricing || {}) as Record<string, unknown>;
        const pricingAddons = ((pricing.addons || {}) as Record<string, unknown>);
        const next: BillingState = {
          planType: typeof b.planType === "string" ? b.planType : DEFAULT_PLAN,
          billingCycle: b.billingCycle === "monthly" ? "monthly" : "annual",
          extraStudentBlocks: Number(b.extraStudentBlocks) || 0,
          addons: { customDomain: Boolean(addons.customDomain), prioritySupport: Boolean(addons.prioritySupport) },
          limits: { includedActiveStudents: Number(limits.includedActiveStudents) || 0, maxActiveStudents: Number(limits.maxActiveStudents) || 0 },
          pricing: {
            monthlyPriceEur: Number(pricing.monthlyPriceEur) || 0,
            extraStudentsBlockSize: Number(pricing.extraStudentsBlockSize) || 0,
            extraStudentsBlockPriceEur: Number(pricing.extraStudentsBlockPriceEur) || 0,
            addons: {
              customDomain: Number((pricingAddons.customDomain as Record<string,unknown>)?.monthlyPriceEur ?? pricingAddons.customDomain) || subscriptionAddonCatalog.customDomain.monthlyPriceEur,
              prioritySupport: Number((pricingAddons.prioritySupport as Record<string,unknown>)?.monthlyPriceEur ?? pricingAddons.prioritySupport) || subscriptionAddonCatalog.prioritySupport.monthlyPriceEur,
            },
          },
        };
        setBilling(next);
        setSavedSnapshot(next);
      }
      setFullSnapshot(data as unknown as Record<string, unknown>);
    } catch { toast.error("Error al cargar la configuración"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  useEffect(() => {
    const status = searchParams.get("stripe");
    if (status === "success") {
      setThankYouOpen(true);
      toast.success("Pago confirmado. Gracias por tu compra.");
      void loadSettings();
    } else if (status === "cancel") {
      toast.info("Checkout cancelado. Puedes reintentarlo cuando quieras.");
    }
  }, [loadSettings, searchParams]);

  const clearStripeParam = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("stripe");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      await redirectToBillingCheckout({
        planType: resolvePlan(billing.planType),
        billingCycle: billing.billingCycle,
        extraStudentBlocks: resolvePlan(billing.planType) === DEFAULT_PLAN ? 0 : billing.extraStudentBlocks,
        addons: { customDomain: billing.addons.customDomain, prioritySupport: billing.addons.prioritySupport, waitlistAutomation: false, renewalAutomation: false },
        successUrl: `${window.location.origin}/admin/settings/plan?stripe=success`,
        cancelUrl: `${window.location.origin}/admin/settings/plan?stripe=cancel`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar el checkout");
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Plan y facturación" description="Gestión del plan y límites de la escuela">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </PageContainer>
    );
  }

  const planKey = resolvePlan(billing.planType);
  const plan = planCatalog[planKey];
  const effectiveBlocks = planKey === DEFAULT_PLAN ? 0 : billing.extraStudentBlocks;
  const includedStudents = plan.limits.includedActiveStudents;
  const maxStudents = includedStudents + effectiveBlocks * plan.extraStudentBlocks.size;
  const currentMonthly = savedSnapshot.pricing.monthlyPriceEur + (savedSnapshot.addons.customDomain ? savedSnapshot.pricing.addons.customDomain : 0) + (savedSnapshot.addons.prioritySupport ? savedSnapshot.pricing.addons.prioritySupport : 0);
  const nextMonthly = plan.billing.monthlyPriceEur + effectiveBlocks * plan.extraStudentBlocks.monthlyPriceEur + (billing.addons.customDomain ? billing.pricing.addons.customDomain : 0) + (billing.addons.prioritySupport ? billing.pricing.addons.prioritySupport : 0);
  const diff = nextMonthly - currentMonthly;

  return (
    <PageContainer title="Plan y facturación" description="Gestión del plan y límites de la escuela">
      <div className="space-y-6 max-w-3xl">
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
          <SectionHeader title="Planes y límites" description="Solo se limita por alumnos activos. No se limita profesores, clases ni aulas." />
          <Separator />

          {/* Plan selector */}
          <FieldGroup label="Tipo de plan" icon={CreditCard}>
            <div className="grid gap-2 sm:grid-cols-3 max-w-2xl">
              {planOrder.map((key) => {
                const p = planCatalog[key];
                const isActive = planKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setBilling({ ...billing, planType: key, extraStudentBlocks: key === DEFAULT_PLAN ? 0 : billing.extraStudentBlocks });
                      setSelectedPlanForModal(key);
                      setPlanModalOpen(true);
                    }}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${isActive ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs">
                      {p.billing.annualEffectiveMonthlyPriceEur} EUR/mes
                      <span className="text-muted-foreground"> (anual) · {p.billing.monthlyPriceEur} mensual</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatAnnualFinancingLabel(p.billing.annualTotalEur)}</p>
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          <Separator />

          {/* Capacity */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capacidad de alumnos</p>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p>Incluidos por plan: <span className="font-medium text-foreground">{includedStudents}</span></p>
              <p>Bloques extra: <span className="font-medium text-foreground">{effectiveBlocks}</span></p>
              <p>Capacidad total: <span className="font-medium text-foreground">{maxStudents}</span> alumnos activos</p>
            </div>
            <FieldGroup label="Bloques extra de alumnos" icon={CreditCard}>
              <Input
                type="number" min="0"
                value={billing.extraStudentBlocks}
                onChange={(e) => setBilling({ ...billing, extraStudentBlocks: Math.max(0, Number(e.target.value) || 0) })}
                disabled={planKey === DEFAULT_PLAN}
                className="h-9 text-sm w-32"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                {planKey === DEFAULT_PLAN
                  ? `${plan.name} no admite bloques extra.`
                  : `Cada bloque añade ${plan.extraStudentBlocks.size} alumnos por ${plan.extraStudentBlocks.monthlyPriceEur} EUR/mes.`}
              </p>
            </FieldGroup>
          </div>

          <Separator />

          {/* Add-ons */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add-ons</p>
            {/* Dominio personalizado — temporalmente oculto */}
            <SwitchRow
              label="Soporte prioritario"
              description={`Respuesta en menos de 24h y onboarding (${billing.pricing.addons.prioritySupport} EUR/mes)`}
              checked={billing.addons.prioritySupport}
              onChange={(v) => setBilling({ ...billing, addons: { ...billing.addons, prioritySupport: v } })}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumen de importe</p>
              <Badge variant="outline">
                {diff === 0 ? "Sin cambios" : diff > 0 ? `+${diff} EUR/mes` : `${diff} EUR/mes`}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-[11px] text-muted-foreground">Cuantía actual</p>
                <p className="text-lg font-semibold text-foreground">{currentMonthly} EUR/mes</p>
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-[11px] text-muted-foreground">Nueva cuantía</p>
                <p className="text-lg font-semibold text-foreground">{nextMonthly} EUR/mes</p>
                <p className="text-[11px] text-muted-foreground mt-1">{billing.billingCycle === "annual" ? formatAnnualFinancingLabel(nextMonthly * 12) : `${nextMonthly} EUR/mes`}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={loadSettings} disabled={checkoutLoading}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void handleCheckout()} disabled={checkoutLoading}>
              <CreditCard className="h-3.5 w-3.5 mr-1" />
              {checkoutLoading ? "Redirigiendo..." : "Continuar pago en Stripe"}
            </Button>
          </div>
        </div>
      </div>

      {/* Plan comparison modal */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comparativa de planes</DialogTitle>
            <DialogDescription>Revisa precio y ventajas antes de confirmar.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            {planOrder.map((key) => {
              const p = planCatalog[key];
              const isSelected = selectedPlanForModal === key;
              return (
                <div key={key} className={`rounded-lg border p-4 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    {isSelected && <Badge>Seleccionado</Badge>}
                  </div>
                  <p className="mt-2 text-xl font-bold text-foreground">
                    {p.billing.annualEffectiveMonthlyPriceEur} EUR/mes
                    <span className="text-sm font-normal text-muted-foreground"> (anual)</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{p.billing.monthlyPriceEur} EUR/mes sin compromiso anual</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatAnnualFinancingLabel(p.billing.annualTotalEur)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Incluye {p.limits.includedActiveStudents} alumnos activos</p>
                  <p className="text-xs text-muted-foreground">Bloque extra: {p.extraStudentBlocks.size} alumnos por {p.extraStudentBlocks.monthlyPriceEur} EUR/mes</p>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {p.display.adminHighlights.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Thank you dialog */}
      <Dialog open={thankYouOpen} onOpenChange={(open) => { setThankYouOpen(open); if (!open) clearStripeParam(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <DialogTitle className="text-center">Gracias por tu compra</DialogTitle>
            <DialogDescription className="text-center">Tu suscripción se ha procesado correctamente. En breve verás reflejado el nuevo plan.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button onClick={() => { setThankYouOpen(false); clearStripeParam(); }}>Perfecto, continuar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
