/**
 * BillingShell — manages all trial, plan, and checkout state for the admin shell.
 *
 * Responsibilities:
 *   - Trial period detection and lock modal
 *   - Checkout flow (plan selection, payment method, financing)
 *   - Plan info banner (plan name, student limits, trial countdown)
 *   - Demo-session banner
 *   - Route transitions and scroll restoration
 *   - Provides BillingContext to downstream shells (OnboardingShell)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { motion } from "framer-motion";
import { AnimatedPage } from "@/components/ui/animated";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { BillingCycle } from "@/lib/api/stripe";
import { redirectToBillingCheckout } from "@/lib/api/stripe";
import { getSchoolSettings, syncTrialPaymentStatusFromStripe, updateSchoolSettings } from "@/lib/api/settings";
import {
  commercialCatalog, foundersPromo, getInterestFreeInstallment, getSelectableSubscriptionAddons,
  planCatalog, planOrder, subscriptionAddonCatalog,
  type PlanType as CatalogPlanType, type SubscriptionAddonKey,
} from "@/lib/commercialCatalog";
import { getSelectedAdminTenantId } from "@/lib/adminContextSelection";
import { isDemoAdminSessionActive } from "@/lib/demoAdmin";
import { BillingContext } from "@/components/layout/BillingContext";
import { OfflineGuard } from "@/components/layout/OfflineGuard";

// ── Constants ──────────────────────────────────────────────────────────────────

const ROUTE_TRANSITION_BLOCK_MS = 260;
const SCROLL_POSITION_KEY_PREFIX = "nexa:admin:scroll:";
const CHECKOUT_PAYMENT_METHOD_KEY = "nexa:checkout:payment-method:v1";
const CHECKOUT_ALLOW_CHANGE_LATER_KEY = "nexa:checkout:allow-change-later:v1";
const CHECKOUT_SELECTION_KEY = "nexa:checkout:selection:v1";
const TRIAL_STRIPE_SYNC_TOAST_KEY = "nexa:trial-stripe-sync-toast:v1";
const FOUNDERS_PROMO_CODE = foundersPromo?.enabled ? foundersPromo.code : null;
const FOUNDERS_MONTHLY_PROMO_PERCENT = foundersPromo?.monthlyDiscountPercent ?? 0;
const FOUNDERS_ANNUAL_PROMO_PERCENT = foundersPromo?.annualDiscountPercent ?? 0;
const CHECKOUT_TOTAL_STEPS = 3;
const ADMIN_HOURLY_COST_EUR = 18;
const NET_ENROLLMENT_CONTRIBUTION_EUR = 55;
const COMMERCIAL_GUARANTEE_DAYS = 30;
const COMMERCIAL_INCLUDED_ADDON_MONTHS = 3;
const FREE_TRIAL_DAYS = commercialCatalog.mvpOffer?.trialDays ?? 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TRIAL_WARNING_DAYS = 3;

// ── Types ──────────────────────────────────────────────────────────────────────

type CheckoutPlanType = CatalogPlanType;
type CheckoutAddonKey = SubscriptionAddonKey;
type CheckoutFlowType = "nexa";
type AnnualFinancingMonths = 3 | 6 | 12;
type CheckoutPaymentMethod = "card" | "sepa" | "transfer";

type SegmentCase = {
  key: "small" | "medium" | "multi";
  title: string;
  activeStudents: number;
  planType: CheckoutPlanType;
};

const CHECKOUT_PLANS: Record<CheckoutPlanType, { label: string; monthlyPriceEur: number; students: number }> = {
  starter: { label: planCatalog.starter.name, monthlyPriceEur: planCatalog.starter.billing.monthlyPriceEur, students: planCatalog.starter.limits.includedActiveStudents },
  pro: { label: planCatalog.pro.name, monthlyPriceEur: planCatalog.pro.billing.monthlyPriceEur, students: planCatalog.pro.limits.includedActiveStudents },
  enterprise: { label: planCatalog.enterprise.name, monthlyPriceEur: planCatalog.enterprise.billing.monthlyPriceEur, students: planCatalog.enterprise.limits.includedActiveStudents },
};

const SEGMENT_CASES: readonly SegmentCase[] = [
  { key: "small", title: "Escuela pequeña", activeStudents: 60, planType: "starter" },
  { key: "medium", title: "Escuela mediana", activeStudents: 180, planType: "pro" },
  { key: "multi", title: "Multi-sede", activeStudents: 420, planType: "enterprise" },
];

function getAdvisorRecommendation(students: number): { recommendedPlan: CheckoutPlanType; recommendedTermMonths: AnnualFinancingMonths; studentsHint: string } {
  if (students < 200) return { recommendedPlan: "starter", recommendedTermMonths: 6, studentsHint: "Menos de 200 alumnos" };
  if (students < 700) return { recommendedPlan: "pro", recommendedTermMonths: 6, studentsHint: "Entre 200 y 699 alumnos" };
  return { recommendedPlan: "enterprise", recommendedTermMonths: 12, studentsHint: "700 alumnos o más" };
}

function toCheckoutPlanType(value: string): CheckoutPlanType {
  if (value === "pro" || value === "enterprise") return value;
  return "starter";
}

function readRegisterDefaults(): { addons: Record<"customDomain" | "prioritySupport" | "waitlistAutomation" | "renewalAutomation", boolean> } {
  const empty = { addons: { customDomain: false, prioritySupport: false, waitlistAutomation: false, renewalAutomation: false } };
  try {
    const raw = window.localStorage.getItem(CHECKOUT_SELECTION_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as { addons?: Record<string, boolean> };
    return {
      addons: {
        customDomain: Boolean(parsed.addons?.customDomain),
        prioritySupport: Boolean(parsed.addons?.prioritySupport),
        waitlistAutomation: Boolean(parsed.addons?.waitlistAutomation),
        renewalAutomation: Boolean(parsed.addons?.renewalAutomation),
      },
    };
  } catch { return empty; }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BillingShell() {
  const { billing, planLabel, refresh, loading: billingLoading } = useBillingEntitlements();
  const { authContext } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();

  // Route transition
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const firstRenderRef = useRef(true);

  // Checkout state
  const [checkoutFlow, setCheckoutFlow] = useState<CheckoutFlowType>("nexa");
  const [checkoutPlanType, setCheckoutPlanType] = useState<CheckoutPlanType>("starter");
  const [checkoutBillingCycle, setCheckoutBillingCycle] = useState<BillingCycle>("annual");
  const [checkoutAnnualFinancingMonths, setCheckoutAnnualFinancingMonths] = useState<AnnualFinancingMonths>(6);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutAddons, setCheckoutAddons] = useState<Record<CheckoutAddonKey, boolean>>({
    customDomain: false, prioritySupport: false, waitlistAutomation: false, renewalAutomation: false,
  });
  const [usePromoInSimulator, setUsePromoInSimulator] = useState(true);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<CheckoutPaymentMethod>(() => {
    const stored = window.localStorage.getItem(CHECKOUT_PAYMENT_METHOD_KEY);
    return stored === "sepa" || stored === "transfer" ? stored : "card";
  });
  const [allowChangePaymentLater, setAllowChangePaymentLater] = useState(
    () => window.localStorage.getItem(CHECKOUT_ALLOW_CHANGE_LATER_KEY) !== "0"
  );
  const [checkoutStripeFailed, setCheckoutStripeFailed] = useState(false);
  const [reserveFallbackLoading, setReserveFallbackLoading] = useState(false);
  const [reserveFallbackSaved, setReserveFallbackSaved] = useState(false);
  const [checkoutTermsAccepted, setCheckoutTermsAccepted] = useState(true);
  const [planAdvisorStudents, setPlanAdvisorStudents] = useState(260);
  const [trialLockDismissed, setTrialLockDismissed] = useState(
    () => sessionStorage.getItem("nexa:trial-dismissed") === "1"
  );
  const [trialStatusSyncing, setTrialStatusSyncing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const checkoutInitializedRef = useRef(false);
  const trialStripeSyncAttemptedRef = useRef(false);
  const isDemoSession = isDemoAdminSessionActive();

  // ── Trial state ──────────────────────────────────────────────────────────────

  const trialStatus = useMemo(() => {
    if (!authContext) return null;
    const selectedTenantId = getSelectedAdminTenantId();
    const activeTenantId = selectedTenantId || authContext.tenant.id;
    const activeMembership = authContext.memberships.find((m) => m.tenantId === activeTenantId)
      ?? authContext.memberships[0] ?? null;
    if (!activeMembership) return null;

    const createdAt = activeMembership.tenantCreatedAt ? new Date(activeMembership.tenantCreatedAt) : null;
    if (!createdAt || isNaN(createdAt.getTime())) return null;

    const now = Date.now();
    const trialEndMs = createdAt.getTime() + FREE_TRIAL_DAYS * DAY_IN_MS;
    const msLeft = trialEndMs - now;
    const daysLeft = Math.ceil(msLeft / DAY_IN_MS);
    const trialPaymentCompleted = Boolean(billing.trialPaymentCompleted);
    const isExpired = msLeft <= 0;

    return { daysLeft, isExpired, trialPaymentCompleted, trialEndMs };
  }, [authContext, billing.trialPaymentCompleted]);

  const isTrialLocked = useMemo(() => {
    if (!trialStatus) return false;
    if (trialStatus.trialPaymentCompleted) return false;
    return trialStatus.isExpired;
  }, [trialStatus]);

  const canDismissTrialLockInDev = import.meta.env.DEV && isTrialLocked;

  const showTrialLockModal = isTrialLocked && !trialLockDismissed;
  const showTrialLoadingModal = trialStatusSyncing && isTrialLocked;

  const bannerTrialText = useMemo(() => {
    if (!trialStatus || trialStatus.trialPaymentCompleted) return null;
    if (trialStatus.isExpired) return "Periodo de prueba finalizado";
    if (trialStatus.daysLeft <= TRIAL_WARNING_DAYS) return `${trialStatus.daysLeft} días de prueba restantes`;
    return `Prueba gratuita: ${trialStatus.daysLeft} días restantes`;
  }, [trialStatus]);

  const bannerTrialToneClass = useMemo(() => {
    if (!trialStatus) return "";
    if (trialStatus.isExpired || (trialStatus.daysLeft <= TRIAL_WARNING_DAYS)) return "text-destructive font-medium";
    return "text-muted-foreground";
  }, [trialStatus]);

  const trialEndsAtLabel = useMemo(() => {
    if (!trialStatus) return null;
    return new Date(trialStatus.trialEndMs).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  }, [trialStatus]);

  // ── Checkout computed values ──────────────────────────────────────────────────

  const isNexaCheckout = checkoutFlow === "nexa";
  const isStarterCheckout = isNexaCheckout && checkoutPlanType === "starter";

  const selectableCheckoutAddons = useMemo(
    () => (isStarterCheckout ? getSelectableSubscriptionAddons("starter") : []),
    [isStarterCheckout]
  );

  const selectableCheckoutAddonKeys = useMemo(
    () => new Set(selectableCheckoutAddons.map((a) => a.key)),
    [selectableCheckoutAddons]
  );

  const checkoutPlanMonthlyPrice = useMemo(() => CHECKOUT_PLANS[checkoutPlanType].monthlyPriceEur, [checkoutPlanType]);
  const checkoutPlanAnnualPrice = useMemo(() => planCatalog[checkoutPlanType].billing.annualTotalEur, [checkoutPlanType]);
  const checkoutAddonsMonthlyTotal = useMemo(
    () => selectableCheckoutAddons.reduce((sum, addon) => checkoutAddons[addon.key] ? sum + addon.monthlyPriceEur : sum, 0),
    [checkoutAddons, selectableCheckoutAddons]
  );
  const checkoutMonthlySubtotal = checkoutPlanMonthlyPrice + checkoutAddonsMonthlyTotal;
  const checkoutAnnualSubtotal = checkoutPlanAnnualPrice + checkoutAddonsMonthlyTotal * 12;
  const annualEquivalentWithoutDiscount = checkoutMonthlySubtotal * 12;
  const checkoutAnnualSavings = Math.max(0, annualEquivalentWithoutDiscount - checkoutAnnualSubtotal);
  const foundersPromoPercent = checkoutBillingCycle === "annual" ? FOUNDERS_ANNUAL_PROMO_PERCENT : FOUNDERS_MONTHLY_PROMO_PERCENT;
  const foundersDiscountAmount = Math.round((checkoutBillingCycle === "annual" ? checkoutAnnualSubtotal : checkoutMonthlySubtotal) * (foundersPromoPercent / 100));
  const checkoutTotalWithFounders = Math.max(0, (checkoutBillingCycle === "annual" ? checkoutAnnualSubtotal : checkoutMonthlySubtotal) - foundersDiscountAmount);
  const checkoutAnnualFinancedInstallment = getInterestFreeInstallment(checkoutAnnualSubtotal, checkoutAnnualFinancingMonths);
  const checkoutAnnualFinancedWithFounders = getInterestFreeInstallment(checkoutTotalWithFounders, checkoutAnnualFinancingMonths);
  const checkoutSimulatorDiscountAmount = usePromoInSimulator ? foundersDiscountAmount : 0;
  const checkoutSimulatorTotal = Math.max(0, (checkoutBillingCycle === "annual" ? checkoutAnnualSubtotal : checkoutMonthlySubtotal) - checkoutSimulatorDiscountAmount);
  const checkoutSimulatorTodayAmount = checkoutBillingCycle === "annual"
    ? getInterestFreeInstallment(checkoutSimulatorTotal, checkoutAnnualFinancingMonths)
    : checkoutSimulatorTotal;
  const annualUpsellSavings = checkoutMonthlySubtotal * 12 - checkoutAnnualSubtotal;
  const monthlyReferenceForAnnual = Math.max(0, Math.round(checkoutAnnualSubtotal / 12));
  const proMonthlyDelta = Math.max(0, planCatalog.pro.billing.annualEffectiveMonthlyPriceEur - checkoutMonthlySubtotal);
  const proIsBetterDeal = isStarterCheckout && proMonthlyDelta === 0;
  const selectedOfferLabel = useMemo(() => CHECKOUT_PLANS[checkoutPlanType].label, [checkoutPlanType]);
  const checkoutCycleTotalLabel = useMemo(() => checkoutBillingCycle === "annual"
    ? `${checkoutAnnualFinancedInstallment} EUR/mes (${checkoutAnnualFinancingMonths} cuotas)`
    : `${checkoutMonthlySubtotal} EUR/mes`,
    [checkoutAnnualFinancedInstallment, checkoutAnnualFinancingMonths, checkoutBillingCycle, checkoutMonthlySubtotal]
  );
  const checkoutAnnualTotalLabel = `${checkoutAnnualSubtotal} EUR/año`;
  const checkoutPrimaryTodayLabel = checkoutBillingCycle === "annual"
    ? `${checkoutAnnualFinancedWithFounders} EUR/mes`
    : `${checkoutTotalWithFounders} EUR`;
  const checkoutFromSixInstallments = getInterestFreeInstallment(checkoutAnnualSubtotal, 6);
  const checkoutTermLabel = checkoutBillingCycle === "annual" ? `${checkoutAnnualFinancingMonths} cuotas sin interés` : "Mensual";
  const checkoutNextChargeDateLabel = useMemo(() => {
    const next = new Date(); next.setMonth(next.getMonth() + 1);
    return next.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  }, []);
  const checkoutPaymentMethodLabel = checkoutPaymentMethod === "card" ? "Tarjeta" : checkoutPaymentMethod === "sepa" ? "Débito SEPA" : "Transferencia";
  const checkoutFallbackFollowupLink = `mailto:facturacion@dancehub.app?subject=${encodeURIComponent(`Reserva plan ${selectedOfferLabel}`)}&body=${encodeURIComponent(`Hola, necesito el enlace de pago posterior para cerrar mi alta.\n\nPlan: ${selectedOfferLabel}\nCiclo: ${checkoutBillingCycle}\nMétodo preferido: ${checkoutPaymentMethodLabel}`)}`;
  const checkoutIncludedStudents = isNexaCheckout ? CHECKOUT_PLANS[checkoutPlanType].students : null;
  const checkoutCostPerActiveStudent = checkoutIncludedStudents ? Math.round((checkoutSimulatorTodayAmount / checkoutIncludedStudents) * 100) / 100 : null;
  const checkoutEquivalentAdminHours = Math.round((checkoutSimulatorTodayAmount / ADMIN_HOURLY_COST_EUR) * 10) / 10;
  const checkoutSavings12Months = checkoutBillingCycle === "annual" ? checkoutAnnualSavings : 0;
  const checkoutBestDiscountLabel = FOUNDERS_PROMO_CODE ? `${FOUNDERS_PROMO_CODE} ${foundersPromoPercent}%` : "";
  const checkoutPaybackEnrollments = Math.max(1, Math.ceil(checkoutSimulatorTodayAmount / NET_ENROLLMENT_CONTRIBUTION_EUR));
  const selectedAdvisorProfile = useMemo(() => getAdvisorRecommendation(planAdvisorStudents), [planAdvisorStudents]);
  const advisorPlanCatalog = planCatalog[selectedAdvisorProfile.recommendedPlan];
  const advisorAnnualSavings = Math.max(0, advisorPlanCatalog.billing.monthlyPriceEur * 12 - advisorPlanCatalog.billing.annualTotalEur);
  const advisorInstallment = getInterestFreeInstallment(advisorPlanCatalog.billing.annualTotalEur, selectedAdvisorProfile.recommendedTermMonths);
  const annualIncentivesActive = checkoutBillingCycle === "annual";
  const annualPromoWeekDeadlineLabel = useMemo(() => {
    const now = new Date(); const day = now.getDay(); const daysUntilSunday = (7 - day) % 7;
    const weekDeadline = new Date(now); weekDeadline.setDate(now.getDate() + daysUntilSunday);
    return weekDeadline.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  }, []);
  const annualIncludedAddon = useMemo(() => {
    const options = [subscriptionAddonCatalog.customDomain, subscriptionAddonCatalog.prioritySupport];
    return options[0].monthlyPriceEur >= options[1].monthlyPriceEur ? options[0] : options[1];
  }, []);
  const annualIncludedAddonSavings = annualIncentivesActive ? annualIncludedAddon.monthlyPriceEur * COMMERCIAL_INCLUDED_ADDON_MONTHS : 0;
  const starterToProAnnualMonthlyDelta = getInterestFreeInstallment(
    Math.max(0, planCatalog.pro.billing.annualTotalEur - planCatalog.starter.billing.annualTotalEur), 12
  );
  const setFoundersCodeCopied = useCallback((copied: boolean) => {
    if (copied) {
      toast.success("Código copiado al portapapeles");
    }
  }, []);
  
  const segmentMiniCases = useMemo(() => SEGMENT_CASES.map((segment) => {
    const segmentPlan = planCatalog[segment.planType];
    const monthly = checkoutBillingCycle === "annual"
      ? getInterestFreeInstallment(segmentPlan.billing.annualTotalEur, checkoutAnnualFinancingMonths)
      : segmentPlan.billing.monthlyPriceEur;
    return {
      ...segment,
      monthly,
      costPerStudent: Math.round((monthly / segment.activeStudents) * 100) / 100,
      payback: Math.max(1, Math.ceil(monthly / NET_ENROLLMENT_CONTRIBUTION_EUR)),
    };
  }), [checkoutAnnualFinancingMonths, checkoutBillingCycle]);

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Route transition
  useEffect(() => {
    if (firstRenderRef.current) return;
    setIsRouteTransitioning(true);
    const timer = window.setTimeout(() => setIsRouteTransitioning(false), ROUTE_TRANSITION_BLOCK_MS);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => { firstRenderRef.current = false; }, []);

  // Scroll restoration
  useEffect(() => {
    const key = `${SCROLL_POSITION_KEY_PREFIX}${location.pathname}`;
    const raw = window.sessionStorage.getItem(key);
    const scrollY = raw ? Number(raw) : 0;
    window.requestAnimationFrame(() => window.scrollTo({ top: Number.isFinite(scrollY) ? scrollY : 0, behavior: "auto" }));
  }, [location.pathname]);

  useEffect(() => {
    const key = `${SCROLL_POSITION_KEY_PREFIX}${location.pathname}`;
    const saveScroll = () => window.sessionStorage.setItem(key, String(window.scrollY));
    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => window.removeEventListener("scroll", saveScroll);
  }, [location.pathname]);

  // Trial lock reset when lock is resolved
  useEffect(() => {
    if (!isTrialLocked && trialLockDismissed) {
      sessionStorage.removeItem("nexa:trial-dismissed");
      setTrialLockDismissed(false);
    }
  }, [isTrialLocked, trialLockDismissed]);

  // Trial stripe sync
  useEffect(() => {
    // Wait until billing data has loaded to avoid firing the sync when
    // trialPaymentCompleted is still at its default (false) initial value.
    if (billingLoading) return;
    if (!isTrialLocked || billing.trialPaymentCompleted) {
      trialStripeSyncAttemptedRef.current = false;
      setTrialStatusSyncing(false);
      return;
    }
    if (trialStripeSyncAttemptedRef.current) return;
    trialStripeSyncAttemptedRef.current = true;
    setTrialStatusSyncing(true);
    void (async () => {
      try {
        const result = await syncTrialPaymentStatusFromStripe();
        if (import.meta.env.DEV) console.info("[trial-sync] backend stripe reconciliation", result);
        if (result?.synced) {
          await refresh();
          const shouldToast = !window.sessionStorage.getItem(TRIAL_STRIPE_SYNC_TOAST_KEY);
          if (shouldToast) {
            toast.success("Pago detectado en Stripe. Se actualizó el estado de tu prueba.");
            window.sessionStorage.setItem(TRIAL_STRIPE_SYNC_TOAST_KEY, "1");
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) console.warn("[trial-sync] stripe reconciliation failed", error);
      } finally { setTrialStatusSyncing(false); }
    })();
  }, [billing.trialPaymentCompleted, billingLoading, isTrialLocked, refresh]);

  // Apply plan selected during registration to trial settings (runs once on first load)
  const trialPlanAppliedRef = useRef(false);
  useEffect(() => {
    if (trialPlanAppliedRef.current || billingLoading) return;
    if (billing.trialPaymentCompleted) {
      // Already paid — no need to apply registration plan
      localStorage.removeItem("selected_plan");
      trialPlanAppliedRef.current = true;
      return;
    }
    const registrationPlan = localStorage.getItem("selected_plan");
    if (!registrationPlan || registrationPlan === billing.planType) {
      trialPlanAppliedRef.current = true;
      return;
    }
    trialPlanAppliedRef.current = true;
    void (async () => {
      try {
        const settings = await getSchoolSettings();
        if (!settings) return;
        await updateSchoolSettings({
          ...settings,
          billing: { ...settings.billing, planType: registrationPlan },
        });
        await refresh();
        localStorage.removeItem("selected_plan");
      } catch { /* ignore — non-critical */ }
    })();
  }, [billing.trialPaymentCompleted, billing.planType, billingLoading, refresh]);

  // Checkout init
  useEffect(() => {
    if (checkoutInitializedRef.current) return;
    const defaults = readRegisterDefaults();
    setCheckoutFlow("nexa");
    setCheckoutPlanType("pro");
    setCheckoutBillingCycle("annual");
    const billingAddons = { customDomain: billing.addons.customDomain, prioritySupport: billing.addons.prioritySupport, waitlistAutomation: billing.addons.waitlistAutomation, renewalAutomation: billing.addons.renewalAutomation };
    const hasBillingAddonSelected = Object.values(billingAddons).some(Boolean);
    setCheckoutAddons(hasBillingAddonSelected ? billingAddons : defaults.addons);
    checkoutInitializedRef.current = true;
  }, [billing.addons, billing.planType]);

  // Checkout persistence
  useEffect(() => {
    const raw = window.localStorage.getItem(CHECKOUT_SELECTION_KEY);
    if (!raw) return;
    try {
      const persisted = JSON.parse(raw) as { flow?: CheckoutFlowType; planType?: CheckoutPlanType; billingCycle?: BillingCycle; annualFinancingMonths?: AnnualFinancingMonths; addons?: Partial<Record<CheckoutAddonKey, boolean>>; usePromoInSimulator?: boolean };
      if (persisted.flow === "nexa") setCheckoutFlow(persisted.flow);
      if (persisted.planType === "starter" || persisted.planType === "pro" || persisted.planType === "enterprise") setCheckoutPlanType(persisted.planType);
      if (persisted.billingCycle === "annual" || persisted.billingCycle === "monthly") setCheckoutBillingCycle(persisted.billingCycle);
      if (persisted.annualFinancingMonths === 3 || persisted.annualFinancingMonths === 6 || persisted.annualFinancingMonths === 12) setCheckoutAnnualFinancingMonths(persisted.annualFinancingMonths);
      if (persisted.addons) setCheckoutAddons((prev) => ({ ...prev, ...persisted.addons }));
      if (typeof persisted.usePromoInSimulator === "boolean") setUsePromoInSimulator(persisted.usePromoInSimulator);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CHECKOUT_SELECTION_KEY, JSON.stringify({ flow: checkoutFlow, planType: checkoutPlanType, billingCycle: checkoutBillingCycle, annualFinancingMonths: checkoutAnnualFinancingMonths, addons: checkoutAddons, usePromoInSimulator }));
  }, [checkoutAddons, checkoutAnnualFinancingMonths, checkoutBillingCycle, checkoutFlow, checkoutPlanType, usePromoInSimulator]);

  useEffect(() => { window.localStorage.setItem(CHECKOUT_PAYMENT_METHOD_KEY, checkoutPaymentMethod); }, [checkoutPaymentMethod]);
  useEffect(() => { window.localStorage.setItem(CHECKOUT_ALLOW_CHANGE_LATER_KEY, allowChangePaymentLater ? "1" : "0"); }, [allowChangePaymentLater]);

  useEffect(() => {
    if (!showTrialLockModal) return;
    setCheckoutStep(1); setFoundersCodeCopied(false); setCheckoutStripeFailed(false); setReserveFallbackSaved(false);
  }, [showTrialLockModal]);

  // Stripe redirect handling
  useEffect(() => {
    const stripeStatus = new URLSearchParams(location.search).get("stripe");
    if (!stripeStatus) return;
    const clearStripeParam = () => {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete("stripe");
      navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams.toString()}` : "" }, { replace: true });
    };
    if (stripeStatus === "success") {
      void (async () => {
        try {
          await persistBillingSelection(true, new Date().toISOString());
          await refresh();
          toast.success("Pago confirmado. Ya puedes seguir usando la plataforma.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "No se pudo confirmar el estado del pago");
        } finally { setCheckoutLoading(false); clearStripeParam(); }
      })();
      return;
    }
    if (stripeStatus === "cancel") {
      toast.info("Pago cancelado. Debes completar el pago para desbloquear la plataforma.");
      setCheckoutLoading(false);
      clearStripeParam();
    }
  }, [location.pathname, location.search, navigate, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Callbacks ──────────────────────────────────────────────────────────────────

  const persistBillingSelection = useCallback(async (trialPaymentCompleted: boolean, trialPaymentCompletedAt: string | null) => {
    const settings = await getSchoolSettings();
    if (!settings) throw new Error("No se pudo cargar la configuración de la escuela");
    await updateSchoolSettings({
      ...settings,
      billing: {
        ...settings.billing,
        planType: checkoutPlanType, billingCycle: checkoutBillingCycle,
        trialPaymentCompleted, trialPaymentCompletedAt: trialPaymentCompletedAt ?? null,
        extraStudentBlocks: Number(settings.billing.extraStudentBlocks ?? 0),
        addons: {
          ...(settings.billing.addons || {}),
          customDomain: isStarterCheckout && selectableCheckoutAddonKeys.has("customDomain") ? checkoutAddons.customDomain : false,
          prioritySupport: isStarterCheckout && selectableCheckoutAddonKeys.has("prioritySupport") ? checkoutAddons.prioritySupport : false,
          waitlistAutomation: isStarterCheckout && selectableCheckoutAddonKeys.has("waitlistAutomation") ? checkoutAddons.waitlistAutomation : false,
          renewalAutomation: isStarterCheckout && selectableCheckoutAddonKeys.has("renewalAutomation") ? checkoutAddons.renewalAutomation : false,
        },
      },
    });
  }, [checkoutAddons, checkoutBillingCycle, checkoutPlanType, isStarterCheckout, selectableCheckoutAddonKeys]);

  const handleTrialCheckout = useCallback(async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const successUrl = `${window.location.origin}/admin?stripe=success`;
      const cancelUrl = `${window.location.origin}/admin?stripe=cancel`;
      await redirectToBillingCheckout({
        planType: checkoutPlanType, billingCycle: checkoutBillingCycle,
        extraStudentBlocks: 0,
        addons: {
          customDomain: isStarterCheckout && selectableCheckoutAddonKeys.has("customDomain") ? checkoutAddons.customDomain : false,
          prioritySupport: isStarterCheckout && selectableCheckoutAddonKeys.has("prioritySupport") ? checkoutAddons.prioritySupport : false,
          waitlistAutomation: isStarterCheckout && selectableCheckoutAddonKeys.has("waitlistAutomation") ? checkoutAddons.waitlistAutomation : false,
          renewalAutomation: isStarterCheckout && selectableCheckoutAddonKeys.has("renewalAutomation") ? checkoutAddons.renewalAutomation : false,
        },
        successUrl, cancelUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar el proceso de pago";
      toast.error(message);
      setCheckoutStripeFailed(true);
      setCheckoutLoading(false);
    }
  }, [checkoutAddons, checkoutBillingCycle, checkoutLoading, checkoutPlanType, isStarterCheckout, selectableCheckoutAddonKeys]);

  const handleReserveFallback = useCallback(async () => {
    if (reserveFallbackLoading) return;
    setReserveFallbackLoading(true);
    try {
      const savedAt = new Date().toISOString();
      const settings = await getSchoolSettings();
      if (!settings) throw new Error("No se pudo cargar la configuración");
      await updateSchoolSettings({
        ...settings,
        billing: {
          ...settings.billing,
          manualCheckoutFallbackLead: {
            source: "trial-lock-stripe-fallback", savedAt, offerLabel: selectedOfferLabel,
            flow: checkoutFlow, annualFinancingMonths: checkoutAnnualFinancingMonths, addons: checkoutAddons,
            paymentMethod: checkoutPaymentMethod, allowChangePaymentLater, userEmail: authContext?.user.email ?? null,
          },
        },
      });
      setReserveFallbackSaved(true);
      toast.success("Reserva creada. Ya puedes abrir el enlace para pago posterior.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la reserva");
    } finally { setReserveFallbackLoading(false); }
  }, [allowChangePaymentLater, authContext?.user.email, checkoutAddons, checkoutAnnualFinancingMonths, checkoutFlow, checkoutPaymentMethod, reserveFallbackLoading, selectedOfferLabel]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <BillingContext.Provider value={{ showTrialLockModal, showTrialLoadingModal }}>
      {/* Plan info banner */}
      <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground md:px-6">
        <span className="font-medium text-foreground">Plan {planLabel}</span>
        {/* <span className="mx-2">·</span> */}
        {/* <span>Límite alumnos activos: {billing.maxActiveStudents}</span> */}
        {/* <span className="mx-2">·</span> */}
        {/* <span>Incluidos base: {billing.includedActiveStudents}</span> */}
        {bannerTrialText ? (
          <><span className="mx-2">·</span><span className={bannerTrialToneClass}>{bannerTrialText}{trialEndsAtLabel ? ` (fin: ${trialEndsAtLabel})` : ""}</span></>
        ) : null}
      </div>

      {/* Demo session banner */}
      {isDemoSession ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 md:px-6">
          Estás en el tenant demo de solo lectura. Puedes explorar el panel real, pero los cambios no se guardan.
        </div>
      ) : null}

      {/* Offline banner */}
      <OfflineGuard />

      {/* Main content area */}
      <main className="relative flex-1 overflow-hidden p-4 md:p-6">
        {!showTrialLockModal && !showTrialLoadingModal ? (
          <AnimatedPage key={location.pathname} animateOnMount={!firstRenderRef.current}>
            {outlet}
          </AnimatedPage>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {showTrialLoadingModal ? "Estamos preparando tu panel..." : "Acceso bloqueado hasta completar el pago del plan."}
            </p>
          </div>
        )}

        {/* Route transition overlay */}
        {isRouteTransitioning && !showTrialLockModal && !showTrialLoadingModal ? (
          <motion.div
            key={`route-transition-${location.pathname}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: ROUTE_TRANSITION_BLOCK_MS / 1000, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-30 bg-background/90 backdrop-blur-[1px]"
          />
        ) : null}
      </main>


      {/* Trial loading modal */}
      {showTrialLoadingModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 py-8">
          <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-medium">
            <p className="text-base font-semibold text-foreground">Te damos la bienvenida</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Estamos dejando todo listo para ti...</span>
              <div className="flex items-center gap-1" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <motion.span key={dot} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: dot * 0.14 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Trial lock modal — simplified */}
      {showTrialLockModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="border-b border-border px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu prueba de {FREE_TRIAL_DAYS} días ha terminado</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">Elige tu plan para continuar</h2>
              <p className="mt-1 text-sm text-muted-foreground">Todos tus datos están guardados. Activa ahora y sigue donde lo dejaste.</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Billing cycle toggle */}
              <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1 gap-0.5">
                <button type="button"
                  onClick={() => setCheckoutBillingCycle("monthly")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition ${checkoutBillingCycle === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Mensual
                </button>
                <button type="button"
                  onClick={() => setCheckoutBillingCycle("annual")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition ${checkoutBillingCycle === "annual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Anual <span className="ml-1 text-[10px] font-bold text-success">2 meses gratis</span>
                </button>
              </div>

              {/* Plan cards */}
              <div className="space-y-3">
                {planOrder.map((planKey) => {
                  const plan = CHECKOUT_PLANS[planKey];
                  const isSelected = checkoutPlanType === planKey;
                  const displayPrice = checkoutBillingCycle === "annual"
                    ? Math.round(planCatalog[planKey].billing.annualTotalEur / 12)
                    : plan.monthlyPriceEur;
                  const isPro = planKey === "pro";

                  return (
                    <button
                      key={planKey}
                      type="button"
                      onClick={() => { setCheckoutFlow("nexa"); setCheckoutPlanType(planKey); }}
                      className={`w-full rounded-xl border-2 p-4 text-left transition ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{plan.label}</p>
                            {isPro && (
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Recomendado</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">Hasta {plan.students} alumnos</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-foreground">{displayPrice}€<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                          {checkoutBillingCycle === "annual" && (
                            <p className="text-[10px] text-success">{planCatalog[planKey].billing.annualSavingsLabel}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Payment — Stripe only */}
              <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <svg viewBox="0 0 60 25" className="h-4 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Stripe">
                  <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.77 10.77 0 01-4.56.94c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.25-.06 1.64zm-5.92-5.15c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.14c-2.01 0-3.3-.94-4.12-1.61l-.02 7.33-4.19.89V5.53h3.7l.24 1.59c.82-.94 2.19-1.97 4.36-1.97 3.94 0 6.67 3.29 6.67 7.48 0 4.71-2.68 7.51-6.64 7.51zm-1.15-11.47c-1.25 0-2.01.52-2.52 1.19l.03 5.92c.49.56 1.24 1.12 2.49 1.12 1.93 0 3.24-2.11 3.24-4.12 0-2.06-1.35-4.11-3.24-4.11zM26.95 4.01c-1.42 0-2.38-1.02-2.38-2.3 0-1.28.97-2.3 2.38-2.3 1.42 0 2.38 1.02 2.38 2.3 0 1.28-.96 2.3-2.38 2.3zm-2.1 15.74V5.53h4.21v14.22h-4.21zM17.96 20.14c-1.85 0-3.96-.82-3.96-.82l.01-3.57s2.01.83 3.96.83c.81 0 1.39-.33 1.39-.94 0-1.83-5.56-1.14-5.56-5.92 0-2.78 2.17-4.59 5.36-4.59 1.54 0 3.09.42 3.09.42v3.5s-1.55-.41-3.09-.41c-.77 0-1.31.3-1.31.88 0 1.66 5.64.97 5.64 5.88 0 3.06-2.32 4.74-5.53 4.74zM7.48 20.14c-4.13 0-7.48-3.32-7.48-7.48 0-4.17 3.35-7.52 7.48-7.52 2.04 0 3.89.82 5.24 2.14l-2.68 2.93c-.72-.69-1.62-1.1-2.56-1.1-2.04 0-3.29 1.71-3.29 3.55 0 1.84 1.25 3.51 3.29 3.51.94 0 1.84-.41 2.56-1.1l2.68 2.93A7.34 7.34 0 017.48 20.14z" fill="currentColor"/>
                </svg>
                <p className="text-xs text-foreground font-medium">Pago seguro con Stripe — tarjeta</p>
              </div>

              {/* Stripe fallback */}
              {checkoutStripeFailed && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-900 mb-2">El pago por Stripe no está disponible en este momento</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void handleReserveFallback()} disabled={reserveFallbackLoading}>
                      {reserveFallbackLoading ? "Guardando..." : "Reservar mi plan"}
                    </Button>
                    {reserveFallbackSaved && (
                      <Button type="button" size="sm" asChild>
                        <a href={checkoutFallbackFollowupLink}>Enlace de pago posterior</a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* CTA */}
              <Button
                className="w-full h-12 text-base"
                onClick={() => void handleTrialCheckout()}
                disabled={checkoutLoading || !checkoutTermsAccepted}
              >
                {checkoutLoading ? "Redirigiendo a Stripe..." : `Activar ${CHECKOUT_PLANS[checkoutPlanType]?.label ?? "plan"} ahora`}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Sin permanencia · Sin interés · Cancela cuando quieras.
                Al activar aceptas los <a href="/legal/terms" className="underline hover:text-foreground" target="_blank">términos</a>.
              </p>
            </div>

            {canDismissTrialLockInDev && (
              <div className="border-t border-border px-6 py-3">
                <Button type="button" variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => { sessionStorage.setItem("nexa:trial-dismissed", "1"); setTrialLockDismissed(true); }}>
                  Cerrar (solo desarrollo)
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </BillingContext.Provider>
  );
}
