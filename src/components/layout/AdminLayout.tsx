import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { Topbar } from "./Topbar";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedPage } from "@/components/ui/animated";
import { PlanDevOverlay } from "@/components/dev/PlanDevOverlay";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSchoolSettings, syncTrialPaymentStatusFromStripe, updateSchoolSettings } from "@/lib/api/settings";
import { redirectToBillingCheckout, redirectToExamSubscriptionCheckout } from "@/lib/api/stripe";
import { toast } from "sonner";
import type { BillingCycle } from "@/lib/api/stripe";
import { Check, CircleHelp, Copy } from "lucide-react";
import { commercialCatalog, getInterestFreeInstallment, getSelectableSubscriptionAddons, planCatalog, planOrder, subscriptionAddonCatalog, type PlanType as CatalogPlanType, type SubscriptionAddonKey } from "@/lib/commercialCatalog";
import { getSelectedAdminTenantId } from "@/lib/adminContextSelection";
import { isDemoAdminSessionActive } from "@/lib/demoAdmin";

const LOGIN_WELCOME_KEY = "nexa:welcome-overlay-until";
const LOGIN_WELCOME_DURATION_MS = 2000;
const ROUTE_TRANSITION_BLOCK_MS = 260;
const SECTION_INTRO_STORAGE_KEY = "nexa:admin-section-intros:v1";
const SECTION_INTRO_MODAL_DURATION_MS = 5200;
const FIRST_LOGIN_GUIDE_PENDING_KEY = "nexa:first-login-guide-pending";
const FIRST_LOGIN_GUIDE_SHOWN_KEY = "nexa:first-login-guide-shown:v1";
const QUICK_HELP_HINT_AUTOHIDE_MS = 2600;
const FREE_TRIAL_DAYS = 14;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TRIAL_WARNING_DAYS = 3;
const TRIAL_STRIPE_SYNC_TOAST_KEY = "nexa:trial-stripe-sync-toast:v1";
const FOUNDERS_PROMO_CODE = "FOUNDERS";
const FOUNDERS_MONTHLY_PROMO_PERCENT = 50;
const FOUNDERS_ANNUAL_PROMO_PERCENT = 15;
const CHECKOUT_TOTAL_STEPS = 3;
const SCROLL_POSITION_KEY_PREFIX = "nexa:admin:scroll:";
const CHECKOUT_PAYMENT_METHOD_KEY = "nexa:checkout:payment-method:v1";
const CHECKOUT_ALLOW_CHANGE_LATER_KEY = "nexa:checkout:allow-change-later:v1";
const CHECKOUT_SELECTION_KEY = "nexa:checkout:selection:v1";
const ADMIN_HOURLY_COST_EUR = 18;
const NET_ENROLLMENT_CONTRIBUTION_EUR = 55;
const COMMERCIAL_GUARANTEE_DAYS = 30;
const COMMERCIAL_INCLUDED_ADDON_MONTHS = 3;

type CheckoutPlanType = CatalogPlanType;
type CheckoutAddonKey = SubscriptionAddonKey;
type CheckoutFlowType = "nexa" | "certifier" | "certifierLite";
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
  if (students < 200) {
    return { recommendedPlan: "starter", recommendedTermMonths: 6, studentsHint: "Menos de 200 alumnos" };
  }

  if (students < 700) {
    return { recommendedPlan: "pro", recommendedTermMonths: 6, studentsHint: "Entre 200 y 699 alumnos" };
  }

  return { recommendedPlan: "enterprise", recommendedTermMonths: 12, studentsHint: "700 alumnos o más" };
}

const CERTIFIER_ASSOCIATIONS_PLAN = commercialCatalog.examSuit?.plans?.associations;
const CERTIFIER_SCHOOLS_PLAN = commercialCatalog.examSuit?.plans?.schools;

function toCheckoutPlanType(value: string): CheckoutPlanType {
  if (value === "pro" || value === "enterprise") {
    return value;
  }

  return "starter";
}

function readRegisterDefaults() {
  const defaults = {
    planType: null as CheckoutPlanType | null,
    addons: {
      customDomain: false,
      prioritySupport: false,
      waitlistAutomation: false,
      renewalAutomation: false,
    },
  };

  try {
    const rawPlan = window.localStorage.getItem("selected_plan");
    if (rawPlan === "starter" || rawPlan === "pro" || rawPlan === "enterprise") {
      defaults.planType = rawPlan;
    }

    const rawAddons = window.localStorage.getItem("selected_addons");
    if (!rawAddons) {
      return defaults;
    }

    const parsed = JSON.parse(rawAddons);
    if (!Array.isArray(parsed)) {
      return defaults;
    }

    const selected = new Set(parsed.filter((item): item is string => typeof item === "string"));

    defaults.addons.customDomain = selected.has("customDomain");
    defaults.addons.prioritySupport = selected.has("prioritySupport");
    defaults.addons.waitlistAutomation = selected.has("waitlistAutomation");
    defaults.addons.renewalAutomation = selected.has("renewalAutomation");
  } catch {
    return defaults;
  }

  return defaults;
}

type SectionIntro = {
  key: string;
  title: string;
  summary: string;
};

const SECTION_INTROS: Array<{ prefix: string; intro: SectionIntro }> = [
  {
    prefix: "/admin/form-builder",
    intro: {
      key: "form-builder",
      title: "Formulario de inscripción",
      summary: "Personaliza campos y orden del formulario público para captar datos sin errores.",
    },
  },
  {
    prefix: "/admin/course-clone",
    intro: {
      key: "course-clone",
      title: "Duplicar cursos",
      summary: "Copia estructura y horarios de un curso anterior para preparar el siguiente ciclo más rápido.",
    },
  },
  {
    prefix: "/admin/schedule",
    intro: {
      key: "schedule",
      title: "Horarios",
      summary: "Organiza clases por día, hora y aula para mantener una planificación clara.",
    },
  },
  {
    prefix: "/admin/classes",
    intro: {
      key: "classes",
      title: "Clases",
      summary: "Gestiona grupos, niveles y cupos disponibles de cada clase.",
    },
  },
  {
    prefix: "/admin/rooms",
    intro: {
      key: "rooms",
      title: "Aulas",
      summary: "Define aulas y su capacidad para evitar solapes y sobreocupaciones.",
    },
  },
  {
    prefix: "/admin/teachers",
    intro: {
      key: "teachers",
      title: "Profesores",
      summary: "Administra docentes, disponibilidad y asignaciones por clase.",
    },
  },
  {
    prefix: "/admin/students",
    intro: {
      key: "students",
      title: "Alumnos",
      summary: "Consulta fichas, estado y progreso académico de tu alumnado.",
    },
  },
  {
    prefix: "/admin/enrollments",
    intro: {
      key: "enrollments",
      title: "Inscripciones",
      summary: "Revisa y gestiona altas, cambios y estado de cada matrícula.",
    },
  },
  {
    prefix: "/admin/pricing",
    intro: {
      key: "pricing",
      title: "Tarifas y bonos",
      summary: "Configura precios, bonos y reglas de cobro según tu oferta.",
    },
  },
  {
    prefix: "/admin/payments",
    intro: {
      key: "payments",
      title: "Pagos",
      summary: "Controla cobros, pendientes y movimientos de caja desde un único lugar.",
    },
  },
  {
    prefix: "/admin/communications",
    intro: {
      key: "communications",
      title: "Comunicación",
      summary: "Envía mensajes segmentados a alumnos, familias o grupos concretos.",
    },
  },
  {
    prefix: "/admin/waitlist",
    intro: {
      key: "waitlist",
      title: "Lista de espera",
      summary: "Gestiona demanda cuando no hay plazas y activa avisos de disponibilidad.",
    },
  },
  {
    prefix: "/admin/renewals",
    intro: {
      key: "renewals",
      title: "Renovaciones",
      summary: "Automatiza confirmaciones para mantener continuidad de alumnado por curso.",
    },
  },
  {
    prefix: "/admin/reception",
    intro: {
      key: "reception",
      title: "Recepción",
      summary: "Registra gestiones diarias de atención y seguimiento rápido en mostrador.",
    },
  },
  {
    prefix: "/admin/branches",
    intro: {
      key: "branches",
      title: "Sedes",
      summary: "Centraliza métricas y configuración clave de todas las sedes desde un solo lugar.",
    },
  },
  {
    prefix: "/admin/exams",
    intro: {
      key: "exams",
      title: "Certifier",
      summary: "Gestiona certificaciones con Certifier y automatiza resultados.",
    },
  },
  {
    prefix: "/admin/school/settings",
    intro: {
      key: "school-settings",
      title: "Perfil de escuela",
      summary: "Actualiza la identidad pública y branding para el portal de alumnos.",
    },
  },
  {
    prefix: "/admin/school/analytics",
    intro: {
      key: "school-analytics",
      title: "Analíticas de escuela",
      summary: "Consulta alumnos, actividad y engagement del canal social de la escuela.",
    },
  },
  {
    prefix: "/admin/school/posts",
    intro: {
      key: "school-posts",
      title: "Publicaciones",
      summary: "Gestiona el contenido de escuela y la aprobación de posts docentes.",
    },
  },
  {
    prefix: "/admin/school/announcements",
    intro: {
      key: "school-announcements",
      title: "Anuncios",
      summary: "Publica avisos importantes y urgentes para alumnos en tiempo real.",
    },
  },
  {
    prefix: "/admin/school/gallery",
    intro: {
      key: "school-gallery",
      title: "Galería",
      summary: "Organiza álbumes y fotos para mostrar clases y eventos en el portal.",
    },
  },
  {
    prefix: "/admin/organization-access",
    intro: {
      key: "organization-access",
      title: "Roles y escuelas",
      summary: "Gestiona miembros, permisos y escuelas vinculadas dentro de una misma cuenta.",
    },
  },
  {
    prefix: "/admin/analytics",
    intro: {
      key: "analytics",
      title: "Analíticas",
      summary: "Visualiza métricas clave para tomar decisiones con datos reales.",
    },
  },
  {
    prefix: "/admin/settings",
    intro: {
      key: "settings",
      title: "Configuración",
      summary: "Ajusta parámetros generales, integraciones y preferencias del centro.",
    },
  },
  {
    prefix: "/admin",
    intro: {
      key: "dashboard",
      title: "Panel",
      summary: "Vista general del estado de la escuela con accesos rápidos a tareas clave.",
    },
  },
];

function getSectionIntro(pathname: string): SectionIntro | null {
  const match = SECTION_INTROS.find((section) => pathname.startsWith(section.prefix));
  return match ? match.intro : null;
}

function readSeenIntros(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SECTION_INTRO_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function persistSeenIntros(seen: Set<string>) {
  window.localStorage.setItem(SECTION_INTRO_STORAGE_KEY, JSON.stringify(Array.from(seen)));
}

export function AdminLayout() {
  const { billing, planLabel, refresh, loading: billingLoading } = useBillingEntitlements();
  const { authContext } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const [displayedPathname, setDisplayedPathname] = useState(location.pathname);
  const [displayedOutlet, setDisplayedOutlet] = useState(outlet);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [showFirstLoginGuide, setShowFirstLoginGuide] = useState(false);
  const [activeSectionIntro, setActiveSectionIntro] = useState<SectionIntro | null>(null);
  const [checkoutFlow, setCheckoutFlow] = useState<CheckoutFlowType>("nexa");
  const [checkoutPlanType, setCheckoutPlanType] = useState<CheckoutPlanType>("starter");
  const [checkoutBillingCycle, setCheckoutBillingCycle] = useState<BillingCycle>("annual");
  const [checkoutAnnualFinancingMonths, setCheckoutAnnualFinancingMonths] = useState<AnnualFinancingMonths>(6);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutAddons, setCheckoutAddons] = useState<Record<CheckoutAddonKey, boolean>>({
    customDomain: false,
    prioritySupport: false,
    waitlistAutomation: false,
    renewalAutomation: false,
  });
  const [foundersCodeCopied, setFoundersCodeCopied] = useState(false);
  const [usePromoInSimulator, setUsePromoInSimulator] = useState(true);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<CheckoutPaymentMethod>(() => {
    const stored = window.localStorage.getItem(CHECKOUT_PAYMENT_METHOD_KEY);
    if (stored === "sepa" || stored === "transfer") {
      return stored;
    }

    return "card";
  });
  const [allowChangePaymentLater, setAllowChangePaymentLater] = useState(() => window.localStorage.getItem(CHECKOUT_ALLOW_CHANGE_LATER_KEY) !== "0");
  const [checkoutStripeFailed, setCheckoutStripeFailed] = useState(false);
  const [reserveFallbackLoading, setReserveFallbackLoading] = useState(false);
  const [reserveFallbackSaved, setReserveFallbackSaved] = useState(false);
  const [checkoutTermsAccepted, setCheckoutTermsAccepted] = useState(true);
  const [planAdvisorStudents, setPlanAdvisorStudents] = useState(260);
  const [trialLockDismissed, setTrialLockDismissed] = useState(false);
  const [trialStatusSyncing, setTrialStatusSyncing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showQuickHelpHint, setShowQuickHelpHint] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const firstRenderRef = useRef(true);
  const lastIntroPathRef = useRef<string | null>(null);
  const checkoutInitializedRef = useRef(false);
  const trialStripeSyncAttemptedRef = useRef(false);
  const quickHelpHideTimerRef = useRef<number | null>(null);
  const isDemoSession = isDemoAdminSessionActive();
  const sectionIntroForPath = useMemo(() => getSectionIntro(location.pathname), [location.pathname]);

  const trialStatus = useMemo(() => {
    if (!authContext) {
      return null;
    }

    const selectedTenantId = getSelectedAdminTenantId();
    const activeTenantId = selectedTenantId || authContext.tenant.id;

    const activeMembership = authContext.memberships.find((membership) => membership.tenantId === activeTenantId)
      ?? authContext.memberships[0]
      ?? null;

    if (!activeMembership?.tenantCreatedAt) {
      return null;
    }

    const createdAtMs = Date.parse(activeMembership.tenantCreatedAt);
    if (!Number.isFinite(createdAtMs)) {
      return null;
    }

    const trialEndsAt = createdAtMs + FREE_TRIAL_DAYS * DAY_IN_MS;
    const remainingMs = trialEndsAt - Date.now();
    const remainingDays = remainingMs <= 0 ? 0 : Math.ceil(remainingMs / DAY_IN_MS);

    return {
      remainingDays,
      endsAt: trialEndsAt,
      expired: remainingMs <= 0,
    };
  }, [authContext]);

  const trialEndsAtLabel = useMemo(() => {
    if (!trialStatus) {
      return null;
    }

    return new Date(trialStatus.endsAt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [trialStatus]);

  const isTrialLocked = Boolean(trialStatus?.expired && !billing.trialPaymentCompleted);
  const showTrialLoadingModal = isTrialLocked && (billingLoading || trialStatusSyncing);
  const canDismissTrialLockInDev = import.meta.env.DEV;
  const showTrialLockModal = isTrialLocked && !showTrialLoadingModal && !(canDismissTrialLockInDev && trialLockDismissed);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    console.info("[trial-sync] lock-evaluation", {
      trialExpired: Boolean(trialStatus?.expired),
      trialRemainingDays: trialStatus?.remainingDays ?? null,
      trialPaymentCompleted: billing.trialPaymentCompleted,
      trialPaymentCompletedAt: billing.trialPaymentCompletedAt,
      isTrialLocked,
      showTrialLockModal,
    });
  }, [billing.trialPaymentCompleted, billing.trialPaymentCompletedAt, isTrialLocked, showTrialLockModal, trialStatus]);

  const bannerTrialText = useMemo(() => {
    if (!trialStatus || trialStatus.remainingDays <= 0) {
      return null;
    }

    if (trialStatus.remainingDays === 1) {
      return "Último día de prueba";
    }

    return `Prueba gratuita: ${trialStatus.remainingDays} días restantes`;
  }, [trialStatus]);

  const bannerTrialToneClass = useMemo(() => {
    if (!trialStatus || trialStatus.remainingDays <= 0) {
      return "";
    }

    return trialStatus.remainingDays <= TRIAL_WARNING_DAYS ? "font-medium text-amber-700" : "";
  }, [trialStatus]);

  const openContextualHelp = useCallback(() => {
    if (showTrialLockModal || showTrialLoadingModal) {
      return;
    }

    if (sectionIntroForPath) {
      setActiveSectionIntro(sectionIntroForPath);
      return;
    }

    setShowFirstLoginGuide(true);
  }, [sectionIntroForPath, showTrialLoadingModal, showTrialLockModal]);

  const hideQuickHelpHint = useCallback(() => {
    if (quickHelpHideTimerRef.current) {
      window.clearTimeout(quickHelpHideTimerRef.current);
    }

    quickHelpHideTimerRef.current = window.setTimeout(() => {
      setShowQuickHelpHint(false);
      quickHelpHideTimerRef.current = null;
    }, QUICK_HELP_HINT_AUTOHIDE_MS);
  }, []);

  const revealQuickHelpHint = useCallback(() => {
    if (!sectionIntroForPath || showTrialLockModal || showTrialLoadingModal) {
      return;
    }

    if (quickHelpHideTimerRef.current) {
      window.clearTimeout(quickHelpHideTimerRef.current);
      quickHelpHideTimerRef.current = null;
    }

    setShowQuickHelpHint(true);
    hideQuickHelpHint();
  }, [hideQuickHelpHint, sectionIntroForPath, showTrialLoadingModal, showTrialLockModal]);

  useEffect(() => {
    if (!isTrialLocked && trialLockDismissed) {
      setTrialLockDismissed(false);
    }
  }, [isTrialLocked, trialLockDismissed]);

  useEffect(() => {
    if (!isTrialLocked || billing.trialPaymentCompleted) {
      trialStripeSyncAttemptedRef.current = false;
      setTrialStatusSyncing(false);
      return;
    }

    if (trialStripeSyncAttemptedRef.current) {
      return;
    }

    trialStripeSyncAttemptedRef.current = true;
    setTrialStatusSyncing(true);

    void (async () => {
      try {
        const result = await syncTrialPaymentStatusFromStripe();
        if (import.meta.env.DEV) {
          console.info("[trial-sync] backend stripe reconciliation", result);
        }

        if (result?.synced) {
          await refresh();

          const shouldToast = typeof window !== "undefined" && !window.sessionStorage.getItem(TRIAL_STRIPE_SYNC_TOAST_KEY);
          if (shouldToast) {
            toast.success("Pago detectado en Stripe. Se actualizó el estado de tu prueba.");
            window.sessionStorage.setItem(TRIAL_STRIPE_SYNC_TOAST_KEY, "1");
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[trial-sync] stripe reconciliation failed", error);
        }
      } finally {
        setTrialStatusSyncing(false);
      }
    })();
  }, [billing.trialPaymentCompleted, isTrialLocked, refresh]);

  useEffect(() => {
    if (checkoutInitializedRef.current) {
      return;
    }

    const defaults = readRegisterDefaults();
    const nextPlanType: CheckoutPlanType = "pro";

    setCheckoutFlow("nexa");
    setCheckoutPlanType(nextPlanType);
    setCheckoutBillingCycle("annual");

    const billingAddons = {
      customDomain: billing.addons.customDomain,
      prioritySupport: billing.addons.prioritySupport,
      waitlistAutomation: billing.addons.waitlistAutomation,
      renewalAutomation: billing.addons.renewalAutomation,
    };

    const hasBillingAddonSelected = Object.values(billingAddons).some(Boolean);
    setCheckoutAddons(hasBillingAddonSelected ? billingAddons : defaults.addons);
    checkoutInitializedRef.current = true;
  }, [billing.addons, billing.planType]);

  const isNexaCheckout = checkoutFlow === "nexa";
  const isStarterCheckout = isNexaCheckout && checkoutPlanType === "starter";

  const selectableCheckoutAddons = useMemo(() => {
    if (!isStarterCheckout) {
      return [];
    }

    return getSelectableSubscriptionAddons("starter");
  }, [isStarterCheckout]);

  const checkoutPlanMonthlyPrice = useMemo(() => {
    if (isNexaCheckout) {
      return CHECKOUT_PLANS[checkoutPlanType].monthlyPriceEur;
    }

    if (checkoutFlow === "certifier") {
      return CERTIFIER_ASSOCIATIONS_PLAN?.billing.monthlyPriceEur ?? 299;
    }

    return CERTIFIER_SCHOOLS_PLAN?.billing.monthlyPriceEur ?? 129;
  }, [checkoutFlow, checkoutPlanType, isNexaCheckout]);

  const checkoutPlanAnnualPrice = useMemo(() => {
    if (isNexaCheckout) {
      return planCatalog[checkoutPlanType].billing.annualTotalEur;
    }

    if (checkoutFlow === "certifier") {
      return CERTIFIER_ASSOCIATIONS_PLAN?.billing.annualTotalEur ?? 2988;
    }

    return CERTIFIER_SCHOOLS_PLAN?.billing.annualTotalEur ?? 1188;
  }, [checkoutFlow, checkoutPlanType, isNexaCheckout]);

  const checkoutAddonsMonthlyTotal = useMemo(() => {
    return selectableCheckoutAddons.reduce((sum, addon) => {
      return checkoutAddons[addon.key] ? sum + addon.monthlyPriceEur : sum;
    }, 0);
  }, [checkoutAddons, selectableCheckoutAddons]);

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

  const selectedOfferLabel = useMemo(() => {
    if (isNexaCheckout) {
      return CHECKOUT_PLANS[checkoutPlanType].label;
    }

    if (checkoutFlow === "certifier") {
      return CERTIFIER_ASSOCIATIONS_PLAN?.name ?? "Certifier";
    }

    return CERTIFIER_SCHOOLS_PLAN?.name ?? "Certifier Lite";
  }, [checkoutFlow, checkoutPlanType, isNexaCheckout]);

  const checkoutCycleTotalLabel = useMemo(() => {
    if (checkoutBillingCycle === "annual") {
      return `${checkoutAnnualFinancedInstallment} EUR/mes (${checkoutAnnualFinancingMonths} cuotas)`;
    }

    return `${checkoutMonthlySubtotal} EUR/mes`;
  }, [checkoutAnnualFinancedInstallment, checkoutAnnualFinancingMonths, checkoutBillingCycle, checkoutMonthlySubtotal]);

  const checkoutAnnualTotalLabel = `${checkoutAnnualSubtotal} EUR/año`;
  const checkoutPrimaryTodayLabel = checkoutBillingCycle === "annual"
    ? `${checkoutAnnualFinancedWithFounders} EUR/mes`
    : `${checkoutTotalWithFounders} EUR`;
  const checkoutFromSixInstallments = getInterestFreeInstallment(checkoutAnnualSubtotal, 6);
  const checkoutTermLabel = checkoutBillingCycle === "annual"
    ? `${checkoutAnnualFinancingMonths} cuotas sin interés`
    : "Mensual";
  const checkoutNextChargeDateLabel = useMemo(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  }, []);
  const checkoutPaymentMethodLabel = checkoutPaymentMethod === "card"
    ? "Tarjeta"
    : checkoutPaymentMethod === "sepa"
      ? "Débito SEPA"
      : "Transferencia";
  const checkoutFallbackFollowupLink = `mailto:facturacion@dancehub.app?subject=${encodeURIComponent(`Reserva plan ${selectedOfferLabel}`)}&body=${encodeURIComponent(
    `Hola, necesito el enlace de pago posterior para cerrar mi alta.\n\nPlan: ${selectedOfferLabel}\nCiclo: ${checkoutBillingCycle}\nFinanciación sin interés: ${checkoutAnnualFinancingMonths} cuotas\nMétodo preferido: ${checkoutPaymentMethodLabel}\nPermitir cambio luego: ${allowChangePaymentLater ? "sí" : "no"}`
  )}`;
  const checkoutIncludedStudents = isNexaCheckout ? CHECKOUT_PLANS[checkoutPlanType].students : null;
  const checkoutCostPerActiveStudent = checkoutIncludedStudents
    ? Math.round((checkoutSimulatorTodayAmount / checkoutIncludedStudents) * 100) / 100
    : null;
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
    const now = new Date();
    const day = now.getDay();
    const daysUntilSunday = (7 - day) % 7;
    const weekDeadline = new Date(now);
    weekDeadline.setDate(now.getDate() + daysUntilSunday);

    return weekDeadline.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  }, []);
  const annualIncludedAddon = useMemo(() => {
    const options = [subscriptionAddonCatalog.customDomain, subscriptionAddonCatalog.prioritySupport];
    return options[0].monthlyPriceEur >= options[1].monthlyPriceEur ? options[0] : options[1];
  }, []);
  const annualIncludedAddonSavings = annualIncentivesActive ? annualIncludedAddon.monthlyPriceEur * COMMERCIAL_INCLUDED_ADDON_MONTHS : 0;
  const starterToProAnnualMonthlyDelta = getInterestFreeInstallment(
    Math.max(0, planCatalog.pro.billing.annualTotalEur - planCatalog.starter.billing.annualTotalEur),
    12
  );
  const segmentMiniCases = useMemo(() => {
    return SEGMENT_CASES.map((segment) => {
      const catalogPlan = planCatalog[segment.planType];
      const segmentMonthly = checkoutBillingCycle === "annual"
        ? getInterestFreeInstallment(catalogPlan.billing.annualTotalEur, checkoutAnnualFinancingMonths)
        : catalogPlan.billing.monthlyPriceEur;
      const segmentCostPerStudent = Math.round((segmentMonthly / segment.activeStudents) * 100) / 100;
      const segmentPayback = Math.max(1, Math.ceil(segmentMonthly / NET_ENROLLMENT_CONTRIBUTION_EUR));

      return {
        ...segment,
        monthly: segmentMonthly,
        costPerStudent: segmentCostPerStudent,
        payback: segmentPayback,
      };
    });
  }, [checkoutAnnualFinancingMonths, checkoutBillingCycle]);

  const selectableCheckoutAddonKeys = useMemo(
    () => new Set(selectableCheckoutAddons.map((addon) => addon.key)),
    [selectableCheckoutAddons]
  );

  useEffect(() => {
    const persistedRaw = window.localStorage.getItem(CHECKOUT_SELECTION_KEY);
    if (!persistedRaw) {
      return;
    }

    try {
      const persisted = JSON.parse(persistedRaw) as {
        flow?: CheckoutFlowType;
        planType?: CheckoutPlanType;
        billingCycle?: BillingCycle;
        annualFinancingMonths?: AnnualFinancingMonths;
        addons?: Partial<Record<CheckoutAddonKey, boolean>>;
        usePromoInSimulator?: boolean;
      };

      if (persisted.flow === "nexa" || persisted.flow === "certifier" || persisted.flow === "certifierLite") {
        setCheckoutFlow(persisted.flow);
      }

      if (persisted.planType === "starter" || persisted.planType === "pro" || persisted.planType === "enterprise") {
        setCheckoutPlanType(persisted.planType);
      }

      if (persisted.billingCycle === "annual" || persisted.billingCycle === "monthly") {
        setCheckoutBillingCycle(persisted.billingCycle);
      }

      if (persisted.annualFinancingMonths === 3 || persisted.annualFinancingMonths === 6 || persisted.annualFinancingMonths === 12) {
        setCheckoutAnnualFinancingMonths(persisted.annualFinancingMonths);
      }

      if (persisted.addons) {
        setCheckoutAddons((prev) => ({
          ...prev,
          ...persisted.addons,
        }));
      }

      if (typeof persisted.usePromoInSimulator === "boolean") {
        setUsePromoInSimulator(persisted.usePromoInSimulator);
      }
    } catch {
      // Ignore corrupted local cache and continue with defaults.
    }
  }, []);

  useEffect(() => {
    const payload = {
      flow: checkoutFlow,
      planType: checkoutPlanType,
      billingCycle: checkoutBillingCycle,
      annualFinancingMonths: checkoutAnnualFinancingMonths,
      addons: checkoutAddons,
      usePromoInSimulator,
    };

    window.localStorage.setItem(CHECKOUT_SELECTION_KEY, JSON.stringify(payload));
  }, [checkoutAddons, checkoutAnnualFinancingMonths, checkoutBillingCycle, checkoutFlow, checkoutPlanType, usePromoInSimulator]);

  const copyFoundersCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(FOUNDERS_PROMO_CODE);
      setFoundersCodeCopied(true);
      toast.success("Código FOUNDERS copiado");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = FOUNDERS_PROMO_CODE;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (!copied) {
        toast.error("No se pudo copiar el código. Cópialo manualmente: FOUNDERS");
        return;
      }

      setFoundersCodeCopied(true);
      toast.success("Código FOUNDERS copiado");
    }
  }, []);

  const persistBillingSelection = useCallback(
    async (trialPaymentCompleted: boolean, trialPaymentCompletedAt: string | null) => {
      const settings = await getSchoolSettings();
      if (!settings) {
        throw new Error("No se pudo cargar la configuración de la escuela");
      }

      const updated = await updateSchoolSettings({
        ...settings,
        billing: {
          ...settings.billing,
          planType: checkoutPlanType,
          billingCycle: checkoutBillingCycle,
          paymentPreference: {
            method: checkoutPaymentMethod,
            allowChangeLater: allowChangePaymentLater,
          },
          checkoutPreference: {
            flow: checkoutFlow,
            annualFinancingMonths: checkoutAnnualFinancingMonths,
            addOns: checkoutAddons,
            promoAutoApplied: checkoutBestDiscountLabel,
            simulatorPromoEnabled: usePromoInSimulator,
          },
          extraStudentBlocks: Number(settings.billing.extraStudentBlocks ?? 0),
          addons: {
            ...(settings.billing.addons || {}),
            customDomain: isStarterCheckout && selectableCheckoutAddonKeys.has("customDomain") ? checkoutAddons.customDomain : false,
            prioritySupport: isStarterCheckout && selectableCheckoutAddonKeys.has("prioritySupport") ? checkoutAddons.prioritySupport : false,
            waitlistAutomation: isStarterCheckout && selectableCheckoutAddonKeys.has("waitlistAutomation") ? checkoutAddons.waitlistAutomation : false,
            renewalAutomation: isStarterCheckout && selectableCheckoutAddonKeys.has("renewalAutomation") ? checkoutAddons.renewalAutomation : false,
          },
          trialPaymentCompleted,
          trialPaymentCompletedAt,
        },
      });

      if (!updated) {
        throw new Error("No se pudo guardar la configuración de billing");
      }
    },
    [allowChangePaymentLater, checkoutAddons, checkoutAnnualFinancingMonths, checkoutBestDiscountLabel, checkoutBillingCycle, checkoutFlow, checkoutPaymentMethod, checkoutPlanType, isStarterCheckout, selectableCheckoutAddonKeys, usePromoInSimulator]
  );

  const handleTrialCheckout = useCallback(async () => {
    if (checkoutLoading) {
      return;
    }

    setCheckoutLoading(true);
    setCheckoutStripeFailed(false);
    try {
      if (isNexaCheckout) {
        await persistBillingSelection(false, null);
        await refresh();

        const successUrl = `${window.location.origin}/admin?stripe=success`;
        const cancelUrl = `${window.location.origin}/admin?stripe=cancel`;

        await redirectToBillingCheckout({
          planType: checkoutPlanType,
          billingCycle: checkoutBillingCycle,
          extraStudentBlocks: 0,
          addons: {
            customDomain: isStarterCheckout && selectableCheckoutAddonKeys.has("customDomain") ? checkoutAddons.customDomain : false,
            prioritySupport: isStarterCheckout && selectableCheckoutAddonKeys.has("prioritySupport") ? checkoutAddons.prioritySupport : false,
            waitlistAutomation: isStarterCheckout && selectableCheckoutAddonKeys.has("waitlistAutomation") ? checkoutAddons.waitlistAutomation : false,
            renewalAutomation: isStarterCheckout && selectableCheckoutAddonKeys.has("renewalAutomation") ? checkoutAddons.renewalAutomation : false,
          },
          successUrl,
          cancelUrl,
        });
        return;
      }

      const result = await redirectToExamSubscriptionCheckout({
        plan: checkoutFlow === "certifier" ? "core" : "lite",
        billingCycle: checkoutBillingCycle,
        successUrl: `${window.location.origin}/admin/settings?tab=billing&stripe=success&module=examsuit`,
        cancelUrl: `${window.location.origin}/admin/settings?tab=billing&stripe=cancel&module=examsuit`,
      });

      if (!result.checkoutUrl) {
        toast.success("Solicitud de compra enviada. Te contactaremos para completar la activación.");
        await refresh();
        setCheckoutLoading(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar el proceso de pago";
      toast.error(message);
      setCheckoutStripeFailed(true);
      setCheckoutLoading(false);
    }
  }, [checkoutAddons, checkoutBillingCycle, checkoutFlow, checkoutLoading, checkoutPlanType, isNexaCheckout, isStarterCheckout, persistBillingSelection, refresh, selectableCheckoutAddonKeys]);

  const handleReserveFallback = useCallback(async () => {
    if (reserveFallbackLoading) {
      return;
    }

    setReserveFallbackLoading(true);
    try {
      const settings = await getSchoolSettings();
      if (!settings) {
        throw new Error("No se pudo guardar la reserva del plan");
      }

      const savedAt = new Date().toISOString();
      const updated = await updateSchoolSettings({
        ...settings,
        billing: {
          ...settings.billing,
          planType: checkoutPlanType,
          billingCycle: checkoutBillingCycle,
          trialPaymentCompleted: false,
          trialPaymentCompletedAt: null,
          manualCheckoutFallbackLead: {
            source: "trial-lock-stripe-fallback",
            savedAt,
            offerLabel: selectedOfferLabel,
            flow: checkoutFlow,
            annualFinancingMonths: checkoutAnnualFinancingMonths,
            addons: checkoutAddons,
            paymentMethod: checkoutPaymentMethod,
            allowChangePaymentLater,
            userEmail: authContext?.user.email ?? null,
          },
        },
      });

      if (!updated) {
        throw new Error("No se pudo guardar la reserva del plan");
      }

      window.localStorage.setItem("nexa:checkout:reserve-fallback:last", JSON.stringify({
        savedAt,
        offerLabel: selectedOfferLabel,
        flow: checkoutFlow,
        billingCycle: checkoutBillingCycle,
        annualFinancingMonths: checkoutAnnualFinancingMonths,
        paymentMethod: checkoutPaymentMethod,
        allowChangePaymentLater,
      }));

      setReserveFallbackSaved(true);
      toast.success("Reserva creada. Ya puedes abrir el enlace para pago posterior.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar la reserva";
      toast.error(message);
    } finally {
      setReserveFallbackLoading(false);
    }
  }, [allowChangePaymentLater, authContext?.user.email, checkoutAddons, checkoutAnnualFinancingMonths, checkoutBillingCycle, checkoutFlow, checkoutPaymentMethod, checkoutPlanType, reserveFallbackLoading, selectedOfferLabel]);

  useEffect(() => {
    if (!showTrialLockModal) {
      return;
    }

    setCheckoutStep(1);
    setFoundersCodeCopied(false);
    setCheckoutStripeFailed(false);
    setReserveFallbackSaved(false);
  }, [showTrialLockModal]);

  useEffect(() => {
    window.localStorage.setItem(CHECKOUT_PAYMENT_METHOD_KEY, checkoutPaymentMethod);
  }, [checkoutPaymentMethod]);

  useEffect(() => {
    window.localStorage.setItem(CHECKOUT_ALLOW_CHANGE_LATER_KEY, allowChangePaymentLater ? "1" : "0");
  }, [allowChangePaymentLater]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(LOGIN_WELCOME_KEY);
    if (!raw) {
      return;
    }

    const until = Number(raw);
    window.sessionStorage.removeItem(LOGIN_WELCOME_KEY);

    if (!Number.isFinite(until)) {
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, until - now);

    if (remaining === 0) {
      return;
    }

    setShowWelcomeOverlay(true);
    const timer = window.setTimeout(() => setShowWelcomeOverlay(false), Math.min(remaining, LOGIN_WELCOME_DURATION_MS));
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (location.pathname === displayedPathname) {
      return;
    }

    setIsRouteTransitioning(true);
    const timer = window.setTimeout(() => {
      setDisplayedPathname(location.pathname);
      setDisplayedOutlet(outlet);
      setIsRouteTransitioning(false);
    }, ROUTE_TRANSITION_BLOCK_MS);

    return () => window.clearTimeout(timer);
  }, [displayedPathname, location.pathname, outlet]);

  useEffect(() => {
    setShowQuickHelpHint(false);
    if (quickHelpHideTimerRef.current) {
      window.clearTimeout(quickHelpHideTimerRef.current);
      quickHelpHideTimerRef.current = null;
    }
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (quickHelpHideTimerRef.current) {
        window.clearTimeout(quickHelpHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    firstRenderRef.current = false;
  }, []);

  useEffect(() => {
    if (isTrialLocked) {
      return;
    }

    if (!location.pathname.startsWith("/admin")) {
      return;
    }

    if (lastIntroPathRef.current === location.pathname) {
      return;
    }

    const intro = getSectionIntro(location.pathname);
    if (!intro) {
      lastIntroPathRef.current = location.pathname;
      return;
    }

    const pendingFirstLoginGuide = window.sessionStorage.getItem(FIRST_LOGIN_GUIDE_PENDING_KEY) === "1";
    if (pendingFirstLoginGuide || showWelcomeOverlay || showFirstLoginGuide) {
      return;
    }

    const seen = readSeenIntros();
    if (seen.has(intro.key)) {
      lastIntroPathRef.current = location.pathname;
      return;
    }

    lastIntroPathRef.current = location.pathname;
    seen.add(intro.key);
    persistSeenIntros(seen);
    setActiveSectionIntro(intro);
  }, [isTrialLocked, location.pathname, showFirstLoginGuide, showWelcomeOverlay]);

  useEffect(() => {
    if (!activeSectionIntro) {
      return;
    }

    const timer = window.setTimeout(() => setActiveSectionIntro(null), SECTION_INTRO_MODAL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeSectionIntro]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const scrollStorageKey = `${SCROLL_POSITION_KEY_PREFIX}${location.pathname}`;
    const raw = window.sessionStorage.getItem(scrollStorageKey);
    const scrollY = raw ? Number(raw) : 0;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Number.isFinite(scrollY) ? scrollY : 0, behavior: "auto" });
    });
  }, [location.pathname]);

  useEffect(() => {
    const scrollStorageKey = `${SCROLL_POSITION_KEY_PREFIX}${location.pathname}`;

    const saveScroll = () => {
      window.sessionStorage.setItem(scrollStorageKey, String(window.scrollY));
    };

    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", saveScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    const pending = window.sessionStorage.getItem(FIRST_LOGIN_GUIDE_PENDING_KEY) === "1";
    if (!pending) {
      return;
    }

    window.sessionStorage.removeItem(FIRST_LOGIN_GUIDE_PENDING_KEY);

    const alreadyShown = window.localStorage.getItem(FIRST_LOGIN_GUIDE_SHOWN_KEY) === "1";
    if (alreadyShown) {
      return;
    }

    window.localStorage.setItem(FIRST_LOGIN_GUIDE_SHOWN_KEY, "1");
    setShowFirstLoginGuide(true);
  }, []);

  useEffect(() => {
    const stripeStatus = new URLSearchParams(location.search).get("stripe");
    if (!stripeStatus) {
      return;
    }

    const clearStripeParam = () => {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete("stripe");
      navigate(
        {
          pathname: location.pathname,
          search: nextParams.toString() ? `?${nextParams.toString()}` : "",
        },
        { replace: true }
      );
    };

    if (stripeStatus === "success") {
      void (async () => {
        try {
          if (import.meta.env.DEV) {
            console.info("[trial-sync] stripe success detected, persisting paid trial state");
          }

          await persistBillingSelection(true, new Date().toISOString());
          await refresh();

          if (import.meta.env.DEV) {
            const settingsAfterPersist = await getSchoolSettings();
            const billingAfterPersist = settingsAfterPersist?.billing;
            console.info("[trial-sync] settings after stripe success persist", {
              trialPaymentCompleted: billingAfterPersist?.trialPaymentCompleted,
              trialPaymentCompletedAt: billingAfterPersist?.trialPaymentCompletedAt,
              planType: billingAfterPersist?.planType,
            });
          }

          toast.success("Pago confirmado. Ya puedes seguir usando la plataforma.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "No se pudo confirmar el estado del pago";
          toast.error(message);
        } finally {
          setCheckoutLoading(false);
          clearStripeParam();
        }
      })();
      return;
    }

    if (stripeStatus === "cancel") {
      toast.info("Pago cancelado. Debes completar el pago para desbloquear la plataforma.");
      setCheckoutLoading(false);
      clearStripeParam();
    }
  }, [location.pathname, location.search, navigate, persistBillingSelection, refresh]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground md:px-6">
          <span className="font-medium text-foreground">Plan {planLabel}</span>
          <span className="mx-2">·</span>
          <span>Límite alumnos activos: {billing.maxActiveStudents}</span>
          <span className="mx-2">·</span>
          <span>Incluidos base: {billing.includedActiveStudents}</span>
          {bannerTrialText ? (
            <>
              <span className="mx-2">·</span>
              <span className={bannerTrialToneClass}>
                {bannerTrialText}
                {trialEndsAtLabel ? ` (fin: ${trialEndsAtLabel})` : ""}
              </span>
            </>
          ) : null}
        </div>
        {isDemoSession ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 md:px-6">
            Estás en el tenant demo de solo lectura. Puedes explorar el panel real, pero los cambios no se guardan.
          </div>
        ) : null}
        {!isOnline ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-900 md:px-6">
            Sin conexión. Mostramos los últimos datos disponibles y algunas acciones pueden fallar hasta reconectar.
          </div>
        ) : null}
        <main className="relative flex-1 overflow-hidden p-4 md:p-6">
          {!showTrialLockModal && !showTrialLoadingModal ? (
            <AnimatedPage key={displayedPathname} animateOnMount={!firstRenderRef.current}>
              {displayedOutlet}
            </AnimatedPage>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {showTrialLoadingModal
                  ? "Estamos preparando tu panel..."
                  : "Acceso bloqueado hasta completar el pago del plan."}
              </p>
            </div>
          )}

          {isRouteTransitioning && !showTrialLockModal && !showTrialLoadingModal ? (
            <motion.div
              key={`route-transition-${location.pathname}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ROUTE_TRANSITION_BLOCK_MS / 1000, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 z-30 bg-background/90 backdrop-blur-[1px]"
            />
          ) : null}

          {showWelcomeOverlay && !showTrialLockModal && !showTrialLoadingModal ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-background/95"
            >
              <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-medium">
                <p className="text-base font-semibold text-foreground">Bienvenido a Nexa</p>
                <p className="mt-1 text-sm text-muted-foreground">Preparando tus datos...</p>
              </div>
            </motion.div>
          ) : null}

          {activeSectionIntro && !showTrialLockModal && !showTrialLoadingModal ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-35 flex items-center justify-center bg-background/75 px-4"
            >
              <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-medium">
                <p className="text-lg font-semibold text-foreground">{activeSectionIntro.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{activeSectionIntro.summary}</p>
                <div className="mt-4 flex justify-end">
                  <Button size="sm" onClick={() => setActiveSectionIntro(null)}>
                    Entendido
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : null}

          {!showTrialLockModal && !showTrialLoadingModal ? (
            <div className="pointer-events-none absolute bottom-20 right-4 z-[80] flex items-end gap-2 md:bottom-24 md:right-6">
              <AnimatePresence>
                {sectionIntroForPath && showQuickHelpHint ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-none hidden max-w-xs rounded-lg border border-border bg-card/95 px-3 py-2 text-left shadow-medium lg:block"
                  >
                    <p className="text-xs font-semibold text-foreground">Guía rápida: {sectionIntroForPath.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{sectionIntroForPath.summary}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    className="pointer-events-auto h-12 w-12 rounded-full shadow-medium"
                    aria-label={sectionIntroForPath ? `Mostrar guía de ${sectionIntroForPath.title}` : "Mostrar guía de inicio"}
                    onClick={openContextualHelp}
                    onMouseEnter={revealQuickHelpHint}
                    onFocus={revealQuickHelpHint}
                    onMouseLeave={hideQuickHelpHint}
                    onBlur={hideQuickHelpHint}
                  >
                    <CircleHelp className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {sectionIntroForPath ? "Volver a ver ayuda de esta sección" : "Ver guía de inicio"}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </main>
        <PlanDevOverlay />
      </div>

      {showTrialLoadingModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 py-8">
          <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-medium">
            <p className="text-base font-semibold text-foreground">Te damos la bienvenida</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Estamos dejando todo listo para ti...</span>
              <div className="flex items-center gap-1" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                    transition={{
                      duration: 0.9,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                      delay: dot * 0.14,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showTrialLockModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 py-8">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-medium md:p-8">
            <h2 className="text-xl font-semibold text-foreground">Tu prueba gratuita finalizó</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Completa este checkout en menos de 2 minutos para mantener activo tu acceso.
            </p>

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
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Desde {checkoutFromSixInstallments} EUR/mes en 6 cuotas</p>
                  <p className="mt-1 text-xs text-muted-foreground">Financiación sin interés y activación inmediata.</p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                  <p className="text-xs text-muted-foreground">Resumen final claro</p>
                  <div className="mt-2 grid gap-2 text-sm text-foreground md:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <span>Cuota hoy</span>
                      <span className="text-base font-bold text-emerald-700">{checkoutPrimaryTodayLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Plazo</span>
                      <span className="font-semibold">{checkoutTermLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Ahorro estimado</span>
                      <span className="font-semibold text-emerald-700">{checkoutSavings12Months} EUR / 12 meses</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Próxima fecha de cargo</span>
                      <span className="font-semibold">{checkoutNextChargeDateLabel}</span>
                    </div>
                  </div>
                </div>

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
                          <Button
                            key={months}
                            type="button"
                            variant={checkoutAnnualFinancingMonths === months ? "default" : "outline"}
                            onClick={() => setCheckoutAnnualFinancingMonths(months as AnnualFinancingMonths)}
                          >
                            {months} cuotas
                          </Button>
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
                        <button
                          key={planKey}
                          type="button"
                          onClick={() => {
                            setCheckoutFlow("nexa");
                            setCheckoutPlanType(planKey);
                          }}
                          className={`rounded-lg border p-3 text-left transition ${
                            isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <p className="font-semibold text-foreground">{plan.label}</p>
                          <p className="text-xs text-muted-foreground">Hasta {plan.students} alumnos</p>
                          <p className="mt-2 text-base font-bold text-foreground">
                            {checkoutBillingCycle === "annual"
                              ? `${getInterestFreeInstallment(planCatalog[planKey].billing.annualTotalEur, checkoutAnnualFinancingMonths)} EUR/mes`
                              : `${plan.monthlyPriceEur} EUR/mes`}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {checkoutBillingCycle === "annual"
                              ? `${planCatalog[planKey].billing.annualTotalEur} EUR/año · ${checkoutAnnualFinancingMonths} cuotas sin interés`
                              : `${planCatalog[planKey].billing.annualTotalEur} EUR/año en anual`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Certifier</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutFlow("certifier")}
                      className={`rounded-lg border p-3 text-left transition ${
                        checkoutFlow === "certifier" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-semibold text-foreground">{CERTIFIER_ASSOCIATIONS_PLAN?.name ?? "Certifier (Asociaciones)"}</p>
                      <p className="mt-2 text-base font-bold text-foreground">
                        {checkoutBillingCycle === "annual"
                          ? `${getInterestFreeInstallment(CERTIFIER_ASSOCIATIONS_PLAN?.billing.annualTotalEur ?? 2988, checkoutAnnualFinancingMonths)} EUR/mes`
                          : `${CERTIFIER_ASSOCIATIONS_PLAN?.billing.monthlyPriceEur ?? 299} EUR/mes`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {checkoutBillingCycle === "annual"
                          ? `${CERTIFIER_ASSOCIATIONS_PLAN?.billing.annualTotalEur ?? 2988} EUR/año · ${checkoutAnnualFinancingMonths} cuotas sin interés`
                          : `${CERTIFIER_ASSOCIATIONS_PLAN?.billing.annualTotalEur ?? 2988} EUR/año en anual`}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutFlow("certifierLite")}
                      className={`rounded-lg border p-3 text-left transition ${
                        checkoutFlow === "certifierLite" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-semibold text-foreground">{CERTIFIER_SCHOOLS_PLAN?.name ?? "Certifier Lite (Escuelas)"}</p>
                      <p className="mt-2 text-base font-bold text-foreground">
                        {checkoutBillingCycle === "annual"
                          ? `${getInterestFreeInstallment(CERTIFIER_SCHOOLS_PLAN?.billing.annualTotalEur ?? 1188, checkoutAnnualFinancingMonths)} EUR/mes`
                          : `${CERTIFIER_SCHOOLS_PLAN?.billing.monthlyPriceEur ?? 129} EUR/mes`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {checkoutBillingCycle === "annual"
                          ? `${CERTIFIER_SCHOOLS_PLAN?.billing.annualTotalEur ?? 1188} EUR/año · ${checkoutAnnualFinancingMonths} cuotas sin interés`
                          : `${CERTIFIER_SCHOOLS_PLAN?.billing.annualTotalEur ?? 1188} EUR/año en anual`}
                      </p>
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">Simulador instantáneo</p>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox checked={usePromoInSimulator} onCheckedChange={(checked) => setUsePromoInSimulator(checked === true)} />
                      Con promo FOUNDERS
                    </label>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-foreground">
                    <div className="flex items-center justify-between">
                      <span>Producto</span>
                      <span className="font-semibold">{selectedOfferLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Add-ons</span>
                      <span>{checkoutAddonsMonthlyTotal} EUR/mes</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>Promo aplicada</span>
                      <span>-{checkoutSimulatorDiscountAmount} EUR</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                      <span>{checkoutBillingCycle === "annual" ? "Cuota hoy" : "Pago hoy"}</span>
                      <span>{checkoutBillingCycle === "annual" ? `${checkoutSimulatorTodayAmount} EUR/mes` : `${checkoutSimulatorTodayAmount} EUR`}</span>
                    </div>
                    {checkoutBillingCycle === "annual" ? (
                      <p className="text-xs text-muted-foreground">Total anual (secundario): {checkoutAnnualTotalLabel}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Ciclo de facturación</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={checkoutBillingCycle === "annual" ? "default" : "outline"} onClick={() => setCheckoutBillingCycle("annual")}>
                      Anual
                    </Button>
                    <Button type="button" variant={checkoutBillingCycle === "monthly" ? "default" : "outline"} onClick={() => setCheckoutBillingCycle("monthly")}>
                      Mensual
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Recomendación: financiación sin interés para maximizar ahorro y menor coste efectivo mensual.
                  </p>
                  {checkoutBillingCycle === "annual" ? (
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={checkoutAnnualFinancingMonths === 3 ? "default" : "outline"} onClick={() => setCheckoutAnnualFinancingMonths(3)}>
                        3 meses
                      </Button>
                      <Button type="button" variant={checkoutAnnualFinancingMonths === 6 ? "default" : "outline"} onClick={() => setCheckoutAnnualFinancingMonths(6)}>
                        6 meses
                      </Button>
                      <Button type="button" variant={checkoutAnnualFinancingMonths === 12 ? "default" : "outline"} onClick={() => setCheckoutAnnualFinancingMonths(12)}>
                        12 meses
                      </Button>
                    </div>
                  ) : null}
                </div>

                {isStarterCheckout ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Add-ons para Starter</p>
                    {selectableCheckoutAddons.map((addon) => {
                      return (
                        <label key={addon.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm">
                          <Checkbox
                            checked={checkoutAddons[addon.key]}
                            onCheckedChange={(checked) => {
                              setCheckoutAddons((prev) => ({ ...prev, [addon.key]: checked === true }));
                            }}
                          />
                          <span className="flex-1 text-muted-foreground">{addon.label}</span>
                          <span className="font-medium text-foreground">+{addon.monthlyPriceEur} EUR/mes</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <p className="text-sm font-semibold text-foreground">Add-ons</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Los add-ons configurables solo se muestran para el plan Starter. En el resto de planes ya están cubiertos por el propio paquete.
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Descuento óptimo autoaplicado</Badge>
                    <span className="text-xs font-semibold text-emerald-800">Aplicamos automáticamente el mejor descuento elegible: {checkoutBestDiscountLabel}</span>
                  </div>
                  <p className="mt-2 text-xs text-emerald-900">
                    No necesitas introducir código manualmente para ver el precio final.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Descuento autoaplicado en checkout</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-bold tracking-[0.2em] text-emerald-700">
                      {checkoutBestDiscountLabel}
                    </p>
                    <Button type="button" variant="outline" className="gap-2" onClick={() => void copyFoundersCode()}>
                      {foundersCodeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {foundersCodeCopied ? "Copiado" : "Copiar etiqueta"}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-emerald-900">
                    El descuento ya se refleja en tu cuota final estimada.
                  </p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                  <p className="text-xs text-muted-foreground">Resumen de precio real</p>
                  <div className="mt-2 space-y-1 text-sm text-foreground">
                    <div className="flex items-center justify-between">
                      <span>Producto seleccionado</span>
                      <span className="font-semibold">{selectedOfferLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Precio mensual base</span>
                      <span>{checkoutPlanMonthlyPrice} EUR/mes</span>
                    </div>
                    {isStarterCheckout ? (
                      <div className="flex items-center justify-between">
                        <span>Add-ons Starter</span>
                        <span>{checkoutAddonsMonthlyTotal} EUR/mes</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span>Equivalente mensual en anual</span>
                      <span>{monthlyReferenceForAnnual} EUR/mes</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-primary/20 pt-2 font-semibold">
                      <span>Total seleccionado</span>
                      <span>{checkoutCycleTotalLabel}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>Descuento FOUNDERS ({foundersPromoPercent}%)</span>
                      <span>-{foundersDiscountAmount} EUR</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-bold text-emerald-800">
                      <span>{checkoutBillingCycle === "annual" ? `Cuota hoy (${checkoutAnnualFinancingMonths} meses)` : "Pago hoy"}</span>
                      <span>{checkoutBillingCycle === "annual" ? `${checkoutAnnualFinancedWithFounders} EUR/mes` : `${checkoutTotalWithFounders} EUR`}</span>
                    </div>
                    {checkoutBillingCycle === "annual" ? (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Total anual (secundario)</span>
                        <span>{checkoutAnnualTotalLabel}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-indigo-300 bg-indigo-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-indigo-600 text-white hover:bg-indigo-600">Plan advisor</Badge>
                    <span className="text-xs font-semibold text-indigo-900">Recomendación según tamaño de escuela</span>
                  </div>
                  <div className="mt-3 rounded-md border border-indigo-200 bg-white p-3">
                    <div className="flex items-center justify-between text-xs text-indigo-900">
                      <span>Alumnos activos</span>
                      <span className="font-semibold">{planAdvisorStudents}</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={1200}
                      step={10}
                      value={planAdvisorStudents}
                      onChange={(event) => setPlanAdvisorStudents(Number(event.target.value))}
                      className="mt-3 w-full accent-indigo-600"
                      aria-label="Cantidad de alumnos de la escuela"
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-indigo-900/80">
                      <span>Starter &lt;200</span>
                      <span>Pro 200-699</span>
                      <span>Enterprise 700+</span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-indigo-200 bg-white p-3 text-sm text-indigo-950">
                    <p>
                      Plan recomendado: <span className="font-semibold">{advisorPlanCatalog.name}</span> ({selectedAdvisorProfile.studentsHint})
                    </p>
                    <p>
                      Plazo recomendado: <span className="font-semibold">{selectedAdvisorProfile.recommendedTermMonths} cuotas sin interés</span>
                    </p>
                    <p>
                      Cuota estimada: <span className="font-semibold">{advisorInstallment} EUR/mes</span>
                    </p>
                    <p>
                      Ahorro esperado: <span className="font-semibold">{advisorAnnualSavings} EUR en 12 meses vs mensual</span>
                    </p>
                  </div>
                </div>

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
                    <li>• Bono de onboarding premium incluido solo en anual.</li>
                    <li>• Garantía de satisfacción de {COMMERCIAL_GUARANTEE_DAYS} días.</li>
                    {annualIncentivesActive ? (
                      <li>• Add-on incluido {COMMERCIAL_INCLUDED_ADDON_MONTHS} meses: {annualIncludedAddon.label} (valor {annualIncludedAddonSavings} EUR).</li>
                    ) : null}
                    <li>
                      • Upgrade sin penalización: empieza en Starter anual y sube a Pro con diferencia prorrateada
                      (desde {starterToProAnnualMonthlyDelta} EUR/mes de diferencia anualizada).
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Percepción de valor</Badge>
                    {checkoutBillingCycle === "annual" ? (
                      <span className="text-xs font-semibold text-emerald-800">Ahorro acumulado: ahorras {checkoutSavings12Months} EUR en 12 meses vs mensual</span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-emerald-900 md:grid-cols-2">
                    <p>
                      Coste por alumno activo:{" "}
                      <span className="font-semibold">
                        {checkoutCostPerActiveStudent === null ? "N/A para este producto" : `${checkoutCostPerActiveStudent} EUR/mes`}
                      </span>
                    </p>
                    <p>
                      Coste operativo equivalente:{" "}
                      <span className="font-semibold">{checkoutEquivalentAdminHours} horas administrativas/mes</span>
                    </p>
                    <p className="md:col-span-2">
                      Payback estimate:{" "}
                      <span className="font-semibold">se amortiza con {checkoutPaybackEnrollments} matrículas nuevas/mes</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold text-foreground">Mini-casos por segmento</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {segmentMiniCases.map((segment) => (
                      <div key={segment.key} className="rounded-md border border-border bg-background p-3 text-xs">
                        <p className="font-semibold text-foreground">{segment.title}</p>
                        <p className="mt-1 text-muted-foreground">{CHECKOUT_PLANS[segment.planType].label} · {segment.activeStudents} alumnos activos</p>
                        <p className="mt-2 text-foreground">Cuota: <span className="font-semibold">{segment.monthly} EUR/mes</span></p>
                        <p className="text-muted-foreground">Coste/alumno: {segment.costPerStudent} EUR/mes</p>
                        <p className="text-muted-foreground">Payback: {segment.payback} matrículas/mes</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold text-foreground">Método de pago</p>
                  <p className="mt-1 text-xs text-muted-foreground">Guardamos tu preferencia para no frenar la decisión.</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button type="button" variant={checkoutPaymentMethod === "card" ? "default" : "outline"} onClick={() => setCheckoutPaymentMethod("card")}>
                      Tarjeta
                    </Button>
                    <Button type="button" variant={checkoutPaymentMethod === "sepa" ? "default" : "outline"} onClick={() => setCheckoutPaymentMethod("sepa")}>
                      SEPA
                    </Button>
                    <Button type="button" variant={checkoutPaymentMethod === "transfer" ? "default" : "outline"} onClick={() => setCheckoutPaymentMethod("transfer")}>
                      Transfer.
                    </Button>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={allowChangePaymentLater} onCheckedChange={(checked) => setAllowChangePaymentLater(checked === true)} />
                    Elegir ahora y cambiar luego
                  </label>
                </div>

                {checkoutStripeFailed ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Fallback activo: reserva plan en 2 clics</p>
                    <p className="mt-1 text-xs text-amber-800">Si Stripe falla, guardamos tu reserva y continuas luego con enlace de pago posterior.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => void handleReserveFallback()} disabled={reserveFallbackLoading}>
                        {reserveFallbackLoading ? "Guardando reserva..." : "1) Reservar plan"}
                      </Button>
                      <Button type="button" asChild disabled={!reserveFallbackSaved}>
                        <a href={checkoutFallbackFollowupLink}>
                          2) Abrir enlace posterior
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : null}

                {checkoutBillingCycle === "monthly" && annualUpsellSavings > 0 ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    Si cambias a anual, ahorras {annualUpsellSavings} EUR al año en este mismo plan.
                  </div>
                ) : null}

                {checkoutBillingCycle === "annual" && checkoutAnnualSavings > 0 ? (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                    Frente a pagar mensual todo el año, estás ahorrando {checkoutAnnualSavings} EUR.
                  </div>
                ) : null}

                {isStarterCheckout ? (
                  <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 text-sm text-violet-900">
                    {proIsBetterDeal
                      ? "Con tu configuración actual, Pro anual te sale igual o mejor que Starter con add-ons."
                      : `Por ${proMonthlyDelta} EUR/mes más puedes subir a Pro anual y desbloquear automatizaciones avanzadas.`}
                  </div>
                ) : null}
              </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2" />

              <div className="flex gap-2">
                <Button onClick={() => void handleTrialCheckout()} disabled={checkoutLoading || !checkoutTermsAccepted}>
                  {checkoutLoading ? "Redirigiendo a pago..." : "Activar con cuota mensual"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>Sin comisiones ocultas</p>
              <p>Sin interés</p>
              <p>Cambio de plan prorrateado</p>
            </div>

            <details className="mt-3 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">Ver condiciones de contratación</summary>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2">
                  <Checkbox checked={checkoutTermsAccepted} onCheckedChange={(checked) => setCheckoutTermsAccepted(checked === true)} />
                  No hay permanencia adicional fuera del periodo pagado.
                </label>
              </div>
            </details>

            {canDismissTrialLockInDev ? (
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => setTrialLockDismissed(true)}
              >
                Cerrar aviso (solo desarrollo)
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Dialog open={showFirstLoginGuide} onOpenChange={setShowFirstLoginGuide}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bienvenido a Nexa</DialogTitle>
            <DialogDescription>
              Gracias por confiar en nosotros. Estos son los primeros pasos para empezar.
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">1.</span> Revisa <span className="font-medium text-foreground">Configuración</span> para datos de tu escuela.
            </li>
            <li>
              <span className="font-medium text-foreground">2.</span> Crea <span className="font-medium text-foreground">Aulas</span>, <span className="font-medium text-foreground">Profesores</span> y <span className="font-medium text-foreground">Clases</span>.
            </li>
            <li>
              <span className="font-medium text-foreground">3.</span> Organiza la semana en <span className="font-medium text-foreground">Horarios</span>.
            </li>
            <li>
              <span className="font-medium text-foreground">4.</span> Publica tu <span className="font-medium text-foreground">Formulario de inscripción</span> y empieza a recibir alumnos.
            </li>
          </ol>

          <DialogFooter>
            <Button onClick={() => setShowFirstLoginGuide(false)}>Empezar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
