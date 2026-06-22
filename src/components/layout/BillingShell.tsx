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
import { PlanDevOverlay } from "@/components/dev/PlanDevOverlay";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { BillingCycle } from "@/lib/api/stripe";
import { redirectToBillingCheckout } from "@/lib/api/stripe";
import { getSchoolSettings, syncTrialPaymentStatusFromStripe, updateSchoolSettings } from "@/lib/api/settings";
import {
  commercialCatalog, getInterestFreeInstallment, getSelectableSubscriptionAddons,
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
const FOUNDERS_PROMO_CODE = "FOUNDERS";
const FOUNDERS_MONTHLY_PROMO_PERCENT = 50;
const FOUNDERS_ANNUAL_PROMO_PERCENT = 15;
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
  const { billing, planLabel, refresh } = useBillingEntitlements();
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
  const [foundersCodeCopied, setFoundersCodeCopied] = useState(false);
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
  const [trialLockDismissed, setTrialLockDismissed] = useState(false);
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
    return `Prueba gratuita — ${trialStatus.daysLeft} días restantes`;
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
  const checkoutBestDiscountLabel = `FOUNDERS ${foundersPromoPercent}%`;
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
    if (!isTrialLocked && trialLockDismissed) setTrialLockDismissed(false);
  }, [isTrialLocked, trialLockDismissed]);

  // Trial stripe sync
  useEffect(() => {
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
  }, [billing.trialPaymentCompleted, isTrialLocked, refresh]);

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

  const copyFoundersCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(FOUNDERS_PROMO_CODE);
      setFoundersCodeCopied(true);
      toast.success("Código FOUNDERS copiado");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = FOUNDERS_PROMO_CODE;
      textarea.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(textarea);
      textarea.focus(); textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (!copied) { toast.error("No se pudo copiar el código. Cópialo manualmente: FOUNDERS"); return; }
      setFoundersCodeCopied(true);
      toast.success("Código FOUNDERS copiado");
    }
  }, []);

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
        <span className="mx-2">·</span>
        <span>Límite alumnos activos: {billing.maxActiveStudents}</span>
        <span className="mx-2">·</span>
        <span>Incluidos base: {billing.includedActiveStudents}</span>
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

      <PlanDevOverlay />

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

      {/* Trial lock / checkout modal */}
      {showTrialLockModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 py-8">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-medium md:p-8 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-semibold text-foreground">Tu prueba gratuita finalizó</h2>
            <p className="mt-2 text-sm text-muted-foreground">Completa este checkout en menos de 2 minutos para mantener activo tu acceso.</p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Resumen + confirmación final</span>
                <span>menos de 2 minutos</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div className="h-1.5 w-[88%] rounded-full bg-primary" />
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {/* Quick summary */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Desde {checkoutFromSixInstallments} EUR/mes en 6 cuotas</p>
                <p className="mt-1 text-xs text-muted-foreground">Financiación sin interés y activación inmediata.</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                <p className="text-xs text-muted-foreground">Resumen final claro</p>
                <div className="mt-2 grid gap-2 text-sm text-foreground md:grid-cols-2">
                  <div className="flex items-center justify-between"><span>Cuota hoy</span><span className="text-base font-bold text-emerald-700">{checkoutPrimaryTodayLabel}</span></div>
                  <div className="flex items-center justify-between"><span>Plazo</span><span className="font-semibold">{checkoutTermLabel}</span></div>
                  <div className="flex items-center justify-between"><span>Ahorro estimado</span><span className="font-semibold text-emerald-700">{checkoutSavings12Months} EUR / 12 meses</span></div>
                  <div className="flex items-center justify-between"><span>Próxima fecha de cargo</span><span className="font-semibold">{checkoutNextChargeDateLabel}</span></div>
                </div>
              </div>

              {/* Billing cycle + plans */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground">Facturación visible desde el primer paso</p>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={checkoutBillingCycle === "annual" ? "default" : "outline"} onClick={() => setCheckoutBillingCycle("annual")}>Financiación sin interés</Button>
                    <Button type="button" variant={checkoutBillingCycle === "monthly" ? "default" : "outline"} onClick={() => setCheckoutBillingCycle("monthly")}>Mensual</Button>
                  </div>
                  {checkoutBillingCycle === "annual" ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[3, 6, 12].map((months) => (
                        <Button key={months} type="button" variant={checkoutAnnualFinancingMonths === months ? "default" : "outline"} onClick={() => setCheckoutAnnualFinancingMonths(months as AnnualFinancingMonths)}>{months} cuotas</Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Nexa School Hub</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {planOrder.map((planKey) => {
                    const plan = CHECKOUT_PLANS[planKey];
                    const isSelected = isNexaCheckout && checkoutPlanType === planKey;
                    return (
                      <button key={planKey} type="button" onClick={() => { setCheckoutFlow("nexa"); setCheckoutPlanType(planKey); }}
                        className={`rounded-lg border p-3 text-left transition ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                        <p className="font-semibold text-foreground">{plan.label}</p>
                        <p className="text-xs text-muted-foreground">Hasta {plan.students} alumnos</p>
                        <p className="mt-2 text-base font-bold text-foreground">
                          {checkoutBillingCycle === "annual" ? `${getInterestFreeInstallment(planCatalog[planKey].billing.annualTotalEur, checkoutAnnualFinancingMonths)} EUR/mes` : `${plan.monthlyPriceEur} EUR/mes`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simulator */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">Simulador instantáneo</p>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={usePromoInSimulator} onCheckedChange={(checked) => setUsePromoInSimulator(checked === true)} />
                    Con promo FOUNDERS
                  </label>
                </div>
                <div className="mt-3 space-y-1 text-sm text-foreground">
                  <div className="flex items-center justify-between"><span>Producto</span><span className="font-semibold">{selectedOfferLabel}</span></div>
                  <div className="flex items-center justify-between"><span>Add-ons</span><span>{checkoutAddonsMonthlyTotal} EUR/mes</span></div>
                  <div className="flex items-center justify-between text-emerald-700"><span>Promo aplicada</span><span>-{checkoutSimulatorDiscountAmount} EUR</span></div>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                    <span>{checkoutBillingCycle === "annual" ? "Cuota hoy" : "Pago hoy"}</span>
                    <span>{checkoutBillingCycle === "annual" ? `${checkoutSimulatorTodayAmount} EUR/mes` : `${checkoutSimulatorTodayAmount} EUR`}</span>
                  </div>
                  {checkoutBillingCycle === "annual" ? <p className="text-xs text-muted-foreground">Total anual: {checkoutAnnualTotalLabel}</p> : null}
                </div>
              </div>
            </div>

            {/* Billing cycle */}
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Ciclo de facturación</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={checkoutBillingCycle === "annual" ? "default" : "outline"} onClick={() => setCheckoutBillingCycle("annual")}>Anual</Button>
                  <Button type="button" variant={checkoutBillingCycle === "monthly" ? "default" : "outline"} onClick={() => setCheckoutBillingCycle("monthly")}>Mensual</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Recomendación: financiación sin interés para maximizar ahorro.</p>
                {checkoutBillingCycle === "annual" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 6, 12].map((months) => (
                      <Button key={months} type="button" variant={checkoutAnnualFinancingMonths === months ? "default" : "outline"} onClick={() => setCheckoutAnnualFinancingMonths(months as AnnualFinancingMonths)}>{months} meses</Button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Add-ons for Starter */}
              {isStarterCheckout ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Add-ons para Starter</p>
                  {selectableCheckoutAddons.map((addon) => (
                    <label key={addon.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm">
                      <Checkbox checked={checkoutAddons[addon.key]} onCheckedChange={(checked) => setCheckoutAddons((prev) => ({ ...prev, [addon.key]: checked === true }))} />
                      <span className="flex-1 text-muted-foreground">{addon.label}</span>
                      <span className="font-medium text-foreground">+{addon.monthlyPriceEur} EUR/mes</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {/* FOUNDERS discount */}
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Descuento óptimo autoaplicado</Badge>
                <p className="mt-2 text-xs text-emerald-900">Aplicamos automáticamente el mejor descuento elegible: {checkoutBestDiscountLabel}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-bold tracking-[0.2em] text-emerald-700">{checkoutBestDiscountLabel}</p>
                  <Button type="button" variant="outline" className="gap-2" onClick={() => void copyFoundersCode()}>
                    {foundersCodeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {foundersCodeCopied ? "Copiado" : "Copiar etiqueta"}
                  </Button>
                </div>
              </div>

              {/* Incentives */}
              <div className="rounded-lg border border-sky-300 bg-sky-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-sky-600 text-white hover:bg-sky-600">Incentivos comerciales</Badge>
                  {annualIncentivesActive ? (
                    <span className="text-xs font-semibold text-sky-900">Precio protegido 12 meses si activas anual esta semana (hasta {annualPromoWeekDeadlineLabel})</span>
                  ) : (
                    <span className="text-xs font-semibold text-sky-900">Activa anual para desbloquear incentivos exclusivos</span>
                  )}
                </div>
                <ul className="mt-3 space-y-1 text-sm text-sky-900">
                  <li>• Garantía de satisfacción de {COMMERCIAL_GUARANTEE_DAYS} días.</li>
                  {annualIncentivesActive ? <li>• Add-on incluido {COMMERCIAL_INCLUDED_ADDON_MONTHS} meses: {annualIncludedAddon.label} (valor {annualIncludedAddonSavings} EUR).</li> : null}
                  <li>• Upgrade sin penalización (desde {starterToProAnnualMonthlyDelta} EUR/mes de diferencia anualizada).</li>
                </ul>
              </div>

              {/* Payment method */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Método de pago</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button type="button" variant={checkoutPaymentMethod === "card" ? "default" : "outline"} onClick={() => setCheckoutPaymentMethod("card")}>Tarjeta</Button>
                  <Button type="button" variant={checkoutPaymentMethod === "sepa" ? "default" : "outline"} onClick={() => setCheckoutPaymentMethod("sepa")}>SEPA</Button>
                  <Button type="button" variant={checkoutPaymentMethod === "transfer" ? "default" : "outline"} onClick={() => setCheckoutPaymentMethod("transfer")}>Transfer.</Button>
                </div>
                <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={allowChangePaymentLater} onCheckedChange={(checked) => setAllowChangePaymentLater(checked === true)} />
                  Elegir ahora y cambiar luego
                </label>
              </div>

              {/* Fallback for Stripe failure */}
              {checkoutStripeFailed ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Fallback activo: reserva plan en 2 clics</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => void handleReserveFallback()} disabled={reserveFallbackLoading}>
                      {reserveFallbackLoading ? "Guardando reserva..." : "1) Reservar plan"}
                    </Button>
                    <Button type="button" asChild disabled={!reserveFallbackSaved}>
                      <a href={checkoutFallbackFollowupLink}>2) Abrir enlace posterior</a>
                    </Button>
                  </div>
                </div>
              ) : null}

              {checkoutBillingCycle === "monthly" && annualUpsellSavings > 0 ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Si cambias a anual, ahorras {annualUpsellSavings} EUR al año en este mismo plan.
                </div>
              ) : null}

              {isStarterCheckout ? (
                <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 text-sm text-violet-900">
                  {proIsBetterDeal ? "Con tu configuración actual, Pro anual te sale igual o mejor que Starter con add-ons."
                    : `Por ${proMonthlyDelta} EUR/mes más puedes subir a Pro anual y desbloquear automatizaciones avanzadas.`}
                </div>
              ) : null}
            </div>

            {/* CTA */}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div />
              <Button onClick={() => void handleTrialCheckout()} disabled={checkoutLoading || !checkoutTermsAccepted}>
                {checkoutLoading ? "Redirigiendo a pago..." : "Activar con cuota mensual"}
              </Button>
            </div>

            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>Sin comisiones ocultas · Sin interés · Cambio de plan prorrateado</p>
            </div>

            <details className="mt-3 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">Ver condiciones de contratación</summary>
              <div className="mt-2">
                <label className="flex items-center gap-2">
                  <Checkbox checked={checkoutTermsAccepted} onCheckedChange={(checked) => setCheckoutTermsAccepted(checked === true)} />
                  No hay permanencia adicional fuera del periodo pagado.
                </label>
              </div>
            </details>

            {canDismissTrialLockInDev ? (
              <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => setTrialLockDismissed(true)}>
                Cerrar aviso (solo desarrollo)
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </BillingContext.Provider>
  );
}
