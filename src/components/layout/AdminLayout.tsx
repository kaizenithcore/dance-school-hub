import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { Topbar } from "./Topbar";
import { motion } from "framer-motion";
import { AnimatedPage } from "@/components/ui/animated";
import { PlanDevOverlay } from "@/components/dev/PlanDevOverlay";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { redirectToBillingCheckout, redirectToExamSubscriptionCheckout } from "@/lib/api/stripe";
import { toast } from "sonner";
import type { BillingCycle } from "@/lib/api/stripe";
import { Check, Copy } from "lucide-react";
import { commercialCatalog, getSelectableSubscriptionAddons, planCatalog, planOrder, type PlanType as CatalogPlanType, type SubscriptionAddonKey } from "@/lib/commercialCatalog";
import { isDemoAdminSessionActive } from "@/lib/demoAdmin";

const LOGIN_WELCOME_KEY = "nexa:welcome-overlay-until";
const LOGIN_WELCOME_DURATION_MS = 2000;
const ROUTE_TRANSITION_BLOCK_MS = 260;
const SECTION_INTRO_STORAGE_KEY = "nexa:admin-section-intros:v1";
const SECTION_INTRO_MODAL_DURATION_MS = 5200;
const FIRST_LOGIN_GUIDE_PENDING_KEY = "nexa:first-login-guide-pending";
const FIRST_LOGIN_GUIDE_SHOWN_KEY = "nexa:first-login-guide-shown:v1";
const FREE_TRIAL_DAYS = 14;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TRIAL_WARNING_DAYS = 3;
const FOUNDERS_PROMO_CODE = "FOUNDERS";
const FOUNDERS_MONTHLY_PROMO_PERCENT = 50;
const FOUNDERS_ANNUAL_PROMO_PERCENT = 15;
const CHECKOUT_TOTAL_STEPS = 3;

type CheckoutPlanType = CatalogPlanType;
type CheckoutAddonKey = SubscriptionAddonKey;
type CheckoutFlowType = "nexa" | "certifier" | "certifierLite";

const CHECKOUT_PLANS: Record<CheckoutPlanType, { label: string; monthlyPriceEur: number; students: number }> = {
  starter: { label: planCatalog.starter.name, monthlyPriceEur: planCatalog.starter.billing.monthlyPriceEur, students: planCatalog.starter.limits.includedActiveStudents },
  pro: { label: planCatalog.pro.name, monthlyPriceEur: planCatalog.pro.billing.monthlyPriceEur, students: planCatalog.pro.limits.includedActiveStudents },
  enterprise: { label: planCatalog.enterprise.name, monthlyPriceEur: planCatalog.enterprise.billing.monthlyPriceEur, students: planCatalog.enterprise.limits.includedActiveStudents },
};

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
  const { billing, planLabel, refresh } = useBillingEntitlements();
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
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutAddons, setCheckoutAddons] = useState<Record<CheckoutAddonKey, boolean>>({
    customDomain: false,
    prioritySupport: false,
    waitlistAutomation: false,
    renewalAutomation: false,
  });
  const [foundersCodeCopied, setFoundersCodeCopied] = useState(false);
  const [trialLockDismissed, setTrialLockDismissed] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const firstRenderRef = useRef(true);
  const lastIntroPathRef = useRef<string | null>(null);
  const checkoutInitializedRef = useRef(false);
  const isDemoSession = isDemoAdminSessionActive();

  const trialStatus = useMemo(() => {
    if (!authContext) {
      return null;
    }

    const activeMembership = authContext.memberships.find((membership) => membership.tenantId === authContext.tenant.id)
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
  const canDismissTrialLockInDev = import.meta.env.DEV;
  const showTrialLockModal = isTrialLocked && !(canDismissTrialLockInDev && trialLockDismissed);

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

  useEffect(() => {
    if (!isTrialLocked && trialLockDismissed) {
      setTrialLockDismissed(false);
    }
  }, [isTrialLocked, trialLockDismissed]);

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
      return `${checkoutAnnualSubtotal} EUR/año`;
    }

    return `${checkoutMonthlySubtotal} EUR/mes`;
  }, [checkoutAnnualSubtotal, checkoutBillingCycle, checkoutMonthlySubtotal]);

  const selectableCheckoutAddonKeys = useMemo(
    () => new Set(selectableCheckoutAddons.map((addon) => addon.key)),
    [selectableCheckoutAddons]
  );

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
    [checkoutAddons, checkoutBillingCycle, checkoutPlanType, isStarterCheckout, selectableCheckoutAddonKeys]
  );

  const handleTrialCheckout = useCallback(async () => {
    if (checkoutLoading) {
      return;
    }

    setCheckoutLoading(true);
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
      setCheckoutLoading(false);
    }
  }, [checkoutAddons, checkoutBillingCycle, checkoutFlow, checkoutLoading, checkoutPlanType, isNexaCheckout, isStarterCheckout, persistBillingSelection, refresh, selectableCheckoutAddonKeys]);

  useEffect(() => {
    if (!showTrialLockModal) {
      return;
    }

    setCheckoutStep(1);
    setFoundersCodeCopied(false);
  }, [showTrialLockModal]);

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
          await persistBillingSelection(true, new Date().toISOString());
          await refresh();
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
        <main className="relative flex-1 overflow-hidden p-4 md:p-6">
          {!showTrialLockModal ? (
            <AnimatedPage key={displayedPathname} animateOnMount={!firstRenderRef.current}>
              {displayedOutlet}
            </AnimatedPage>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Acceso bloqueado hasta completar el pago del plan.</p>
            </div>
          )}

          {isRouteTransitioning && !showTrialLockModal ? (
            <motion.div
              key={`route-transition-${location.pathname}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ROUTE_TRANSITION_BLOCK_MS / 1000, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 z-30 bg-background/90 backdrop-blur-[1px]"
            />
          ) : null}

          {showWelcomeOverlay && !showTrialLockModal ? (
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

          {activeSectionIntro && !showTrialLockModal ? (
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
        </main>
        <PlanDevOverlay />
      </div>

      {showTrialLockModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 py-8">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-medium md:p-8">
            <h2 className="text-xl font-semibold text-foreground">Tu prueba gratuita finalizó</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Completa este checkout guiado en 3 pasos para mantener activo tu acceso.
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Paso {checkoutStep} de {CHECKOUT_TOTAL_STEPS}</span>
                <span>{checkoutStep === 1 ? "Producto" : checkoutStep === 2 ? "Facturación" : "Confirmación"}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className={`h-1.5 rounded-full ${checkoutStep >= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
            </div>

            {checkoutStep === 1 ? (
              <div className="mt-6 space-y-6">
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
                          <p className="mt-2 text-sm font-semibold text-foreground">{planCatalog[planKey].billing.annualEffectiveMonthlyPriceEur} EUR/mes (en anual)</p>
                          <p className="text-[11px] text-muted-foreground">{plan.monthlyPriceEur} EUR/mes (en mensual)</p>
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
                      <p className="mt-2 text-sm font-semibold text-foreground">{CERTIFIER_ASSOCIATIONS_PLAN?.billing.monthlyPriceEur ?? 299} EUR/mes</p>
                      <p className="text-[11px] text-muted-foreground">{CERTIFIER_ASSOCIATIONS_PLAN?.billing.annualEffectiveMonthlyPriceEur ?? 249} EUR/mes en anual</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutFlow("certifierLite")}
                      className={`rounded-lg border p-3 text-left transition ${
                        checkoutFlow === "certifierLite" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-semibold text-foreground">{CERTIFIER_SCHOOLS_PLAN?.name ?? "Certifier Lite (Escuelas)"}</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{CERTIFIER_SCHOOLS_PLAN?.billing.monthlyPriceEur ?? 129} EUR/mes</p>
                      <p className="text-[11px] text-muted-foreground">{CERTIFIER_SCHOOLS_PLAN?.billing.annualEffectiveMonthlyPriceEur ?? 99} EUR/mes en anual</p>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {checkoutStep === 2 ? (
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
                    Recomendación: anual para maximizar ahorro y menor coste efectivo mensual.
                  </p>
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
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Código FOUNDERS</Badge>
                    <span className="text-xs font-semibold text-emerald-800">50% primer mes en mensual · 15% en anual</span>
                  </div>
                  <p className="mt-2 text-xs text-emerald-900">
                    Copia FOUNDERS y pégalo en la pasarela de pago para aplicar la promo según tu ciclo.
                  </p>
                </div>
              </div>
            ) : null}

            {checkoutStep === 3 ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Código para pasarela</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-bold tracking-[0.2em] text-emerald-700">
                      {FOUNDERS_PROMO_CODE}
                    </p>
                    <Button type="button" variant="outline" className="gap-2" onClick={() => void copyFoundersCode()}>
                      {foundersCodeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {foundersCodeCopied ? "Copiado" : "Copiar código"}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-emerald-900">
                    Promo FOUNDERS: {FOUNDERS_MONTHLY_PROMO_PERCENT}% en el primer mes (mensual) o {FOUNDERS_ANNUAL_PROMO_PERCENT}% en el pago anual.
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
                      <span>{checkoutBillingCycle === "annual" ? "Pagas hoy" : "Primer pago"}</span>
                      <span>{checkoutTotalWithFounders} EUR</span>
                    </div>
                  </div>
                </div>

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
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {checkoutStep > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setCheckoutStep((prev) => Math.max(1, prev - 1))}>
                    Atrás
                  </Button>
                ) : null}
              </div>

              <div className="flex gap-2">
                {checkoutStep < CHECKOUT_TOTAL_STEPS ? (
                  <Button type="button" onClick={() => setCheckoutStep((prev) => Math.min(CHECKOUT_TOTAL_STEPS, prev + 1))}>
                    Siguiente paso
                  </Button>
                ) : (
                  <Button onClick={() => void handleTrialCheckout()} disabled={checkoutLoading}>
                    {checkoutLoading ? "Redirigiendo a pago..." : "Ir a la pasarela de pago"}
                  </Button>
                )}
              </div>
            </div>

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
