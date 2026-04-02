import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Music, ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, AlertCircle, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { registerSchool } from "@/lib/auth";
import { commercialCatalog, formatAnnualFinancingLabel, getInterestFreeInstallment, getSelectableSubscriptionAddons, planCatalog, planOrder, subscriptionAddonCatalog, type PlanType, type SubscriptionAddonKey } from "@/lib/commercialCatalog";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const FOUNDERS_PROMO_CODE = "FOUNDERS";
const FOUNDERS_MONTHLY_PROMO_PERCENT = 50;
const FOUNDERS_ANNUAL_PROMO_PERCENT = 15;
const ASSOCIATED_PRO_ANNUAL_DISCOUNT_PERCENT = 10;
const ADMIN_HOURLY_COST_EUR = 18;
const NET_ENROLLMENT_CONTRIBUTION_EUR = 55;
const COMMERCIAL_GUARANTEE_DAYS = 30;
const COMMERCIAL_INCLUDED_ADDON_MONTHS = 3;
const REGISTER_CHECKOUT_SELECTION_KEY = "nexa:register:checkout-selection:v1";

type BillingCycle = "monthly" | "annual";
type AnnualFinancingMonths = 3 | 6 | 12;
type RegisterOfferId = PlanType | "certifier" | "certifierLite";

type SegmentCase = {
  key: "small" | "medium" | "multi";
  title: string;
  activeStudents: number;
  planType: PlanType;
};

const SEGMENT_CASES: readonly SegmentCase[] = [
  { key: "small", title: "Escuela pequeña", activeStudents: 60, planType: "starter" },
  { key: "medium", title: "Escuela mediana", activeStudents: 180, planType: "pro" },
  { key: "multi", title: "Multi-sede", activeStudents: 420, planType: "enterprise" },
];

function getAdvisorRecommendation(students: number): { recommendedPlan: PlanType; recommendedTermMonths: AnnualFinancingMonths; studentsHint: string } {
  if (students < 200) {
    return { recommendedPlan: "starter", recommendedTermMonths: 6, studentsHint: "Menos de 200 alumnos" };
  }

  if (students < 700) {
    return { recommendedPlan: "pro", recommendedTermMonths: 6, studentsHint: "Entre 200 y 699 alumnos" };
  }

  return { recommendedPlan: "enterprise", recommendedTermMonths: 12, studentsHint: "700 alumnos o más" };
}

interface RegisterOffer {
  id: RegisterOfferId;
  kind: "nexa" | "certifier" | "certifierLite";
  name: string;
  description: string;
  studentsLabel: string;
  monthlyPriceEur: number;
  annualEffectiveMonthlyPriceEur: number;
  annualTotalEur: number;
  annualSavingsLabel?: string;
  highlighted?: boolean;
}

function isNexaPlan(value: RegisterOfferId): value is PlanType {
  return value === "starter" || value === "pro" || value === "enterprise";
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Step 1 - School info
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  // Step 2 - Account
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Step 3 - Plan selection
  const [selectedPlan, setSelectedPlan] = useState<RegisterOfferId>("pro");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [annualFinancingMonths, setAnnualFinancingMonths] = useState<AnnualFinancingMonths>(6);
  const [foundersCodeCopied, setFoundersCodeCopied] = useState(false);
  const [usePromoInSimulator, setUsePromoInSimulator] = useState(true);
  const [isAssociatedSchool, setIsAssociatedSchool] = useState(false);
  const [planAdvisorStudents, setPlanAdvisorStudents] = useState(260);
  const [addOns, setAddOns] = useState<Record<SubscriptionAddonKey, boolean>>({
    customDomain: false,
    prioritySupport: false,
    waitlistAutomation: false,
    renewalAutomation: false,
  });

  const certifierAssociationsPlan = commercialCatalog.examSuit?.plans?.associations;
  const certifierSchoolsPlan = commercialCatalog.examSuit?.plans?.schools;

  useEffect(() => {
    const raw = window.localStorage.getItem(REGISTER_CHECKOUT_SELECTION_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        selectedPlan?: RegisterOfferId;
        billingCycle?: BillingCycle;
        annualFinancingMonths?: AnnualFinancingMonths;
        addOns?: Partial<Record<SubscriptionAddonKey, boolean>>;
        usePromoInSimulator?: boolean;
      };

      if (parsed.selectedPlan) {
        setSelectedPlan(parsed.selectedPlan);
      }

      if (parsed.billingCycle === "annual" || parsed.billingCycle === "monthly") {
        setBillingCycle(parsed.billingCycle);
      }

      if (parsed.annualFinancingMonths === 3 || parsed.annualFinancingMonths === 6 || parsed.annualFinancingMonths === 12) {
        setAnnualFinancingMonths(parsed.annualFinancingMonths);
      }

      if (parsed.addOns) {
        setAddOns((prev) => ({ ...prev, ...parsed.addOns }));
      }

      if (typeof parsed.usePromoInSimulator === "boolean") {
        setUsePromoInSimulator(parsed.usePromoInSimulator);
      }
    } catch {
      // Ignore invalid cache and keep defaults.
    }
  }, []);

  useEffect(() => {
    const payload = {
      selectedPlan,
      billingCycle,
      annualFinancingMonths,
      addOns,
      usePromoInSimulator,
    };

    window.localStorage.setItem(REGISTER_CHECKOUT_SELECTION_KEY, JSON.stringify(payload));
  }, [addOns, annualFinancingMonths, billingCycle, selectedPlan, usePromoInSimulator]);

  const offers: RegisterOffer[] = [
    ...planOrder.map((planType) => ({
      id: planType,
      kind: "nexa" as const,
      name: planCatalog[planType].name,
      description: `Plan ${planCatalog[planType].name} para gestión completa de escuela.`,
      studentsLabel: planCatalog[planType].limits.marketingLabel,
      monthlyPriceEur: planCatalog[planType].billing.monthlyPriceEur,
      annualEffectiveMonthlyPriceEur: planCatalog[planType].billing.annualEffectiveMonthlyPriceEur,
      annualTotalEur: planCatalog[planType].billing.annualTotalEur,
      annualSavingsLabel: planCatalog[planType].billing.annualSavingsLabel,
      highlighted: planCatalog[planType].highlighted,
    })),
    ...(certifierAssociationsPlan
      ? [{
          id: "certifier" as const,
          kind: "certifier" as const,
          name: certifierAssociationsPlan.name,
          description: "Para asociaciones y entidades certificadoras.",
          studentsLabel: "Gestión de convocatorias y exámenes",
          monthlyPriceEur: certifierAssociationsPlan.billing.monthlyPriceEur,
          annualEffectiveMonthlyPriceEur: certifierAssociationsPlan.billing.annualEffectiveMonthlyPriceEur,
          annualTotalEur: certifierAssociationsPlan.billing.annualTotalEur,
          annualSavingsLabel: certifierAssociationsPlan.billing.annualSavingsLabel,
          highlighted: false,
        }]
      : []),
    ...(certifierSchoolsPlan
      ? [{
          id: "certifierLite" as const,
          kind: "certifierLite" as const,
          name: certifierSchoolsPlan.name,
          description: "Para escuelas que sólo necesitan gestión de exámenes y certificados.",
          studentsLabel: "Escenario examen + certificación",
          monthlyPriceEur: certifierSchoolsPlan.billing.monthlyPriceEur,
          annualEffectiveMonthlyPriceEur: certifierSchoolsPlan.billing.annualEffectiveMonthlyPriceEur,
          annualTotalEur: certifierSchoolsPlan.billing.annualTotalEur,
          annualSavingsLabel: certifierSchoolsPlan.billing.annualSavingsLabel,
          highlighted: false,
        }]
      : []),
  ];

  const selectedOffer = offers.find((offer) => offer.id === selectedPlan) ?? offers[0];
  const selectedNexaPlan = isNexaPlan(selectedPlan) ? selectedPlan : null;
  const selectableAddOns = selectedNexaPlan ? getSelectableSubscriptionAddons(selectedNexaPlan) : [];

  const addOnMonthlyTotal = selectableAddOns
    .filter((addon) => addOns[addon.key])
    .reduce((sum, addon) => sum + addon.monthlyPriceEur, 0);

  const monthlySubtotal = selectedOffer.monthlyPriceEur + addOnMonthlyTotal;
  const annualSubtotal = selectedOffer.annualTotalEur + addOnMonthlyTotal * 12;
  const annualEquivalentWithoutSavings = monthlySubtotal * 12;
  const annualSavingsAmount = Math.max(0, annualEquivalentWithoutSavings - annualSubtotal);

  const foundersPercent = billingCycle === "annual" ? FOUNDERS_ANNUAL_PROMO_PERCENT : FOUNDERS_MONTHLY_PROMO_PERCENT;
  const foundersDiscountAmount = Math.round((billingCycle === "annual" ? annualSubtotal : monthlySubtotal) * (foundersPercent / 100));
  const totalWithFounders = Math.max(0, (billingCycle === "annual" ? annualSubtotal : monthlySubtotal) - foundersDiscountAmount);
  const simulatorDiscountAmount = usePromoInSimulator ? foundersDiscountAmount : 0;
  const simulatorTotal = Math.max(0, (billingCycle === "annual" ? annualSubtotal : monthlySubtotal) - simulatorDiscountAmount);
  const annualFinancedSubtotal = getInterestFreeInstallment(annualSubtotal, annualFinancingMonths);
  const annualFinancedWithFounders = getInterestFreeInstallment(totalWithFounders, annualFinancingMonths);
  const annualFinancedSimulatorTotal = getInterestFreeInstallment(simulatorTotal, annualFinancingMonths);
  const fromSixInstallments = getInterestFreeInstallment(annualSubtotal, 6);
  const simulatorMonthlyToday = billingCycle === "annual" ? annualFinancedSimulatorTotal : simulatorTotal;
  const selectedPlanIncludedStudents = selectedNexaPlan ? planCatalog[selectedNexaPlan].limits.includedActiveStudents : null;
  const costPerActiveStudent = selectedPlanIncludedStudents
    ? Math.round((simulatorMonthlyToday / selectedPlanIncludedStudents) * 100) / 100
    : null;
  const equivalentAdminHours = Math.round((simulatorMonthlyToday / ADMIN_HOURLY_COST_EUR) * 10) / 10;
  const savingsIn12Months = billingCycle === "annual" ? annualSavingsAmount : 0;
  const paybackEnrollments = Math.max(1, Math.ceil(simulatorMonthlyToday / NET_ENROLLMENT_CONTRIBUTION_EUR));
  const selectedAdvisorProfile = getAdvisorRecommendation(planAdvisorStudents);
  const advisorPlanCatalog = planCatalog[selectedAdvisorProfile.recommendedPlan];
  const advisorAnnualSavings = Math.max(0, advisorPlanCatalog.billing.monthlyPriceEur * 12 - advisorPlanCatalog.billing.annualTotalEur);
  const advisorInstallment = getInterestFreeInstallment(advisorPlanCatalog.billing.annualTotalEur, selectedAdvisorProfile.recommendedTermMonths);
  const annualIncentivesActive = billingCycle === "annual";
  const annualPromoWeekDeadlineLabel = (() => {
    const now = new Date();
    const day = now.getDay();
    const daysUntilSunday = (7 - day) % 7;
    const weekDeadline = new Date(now);
    weekDeadline.setDate(now.getDate() + daysUntilSunday);

    return weekDeadline.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  })();
  const annualIncludedAddon = (() => {
    const options = [subscriptionAddonCatalog.customDomain, subscriptionAddonCatalog.prioritySupport];
    return options[0].monthlyPriceEur >= options[1].monthlyPriceEur ? options[0] : options[1];
  })();
  const annualIncludedAddonSavings = annualIncentivesActive ? annualIncludedAddon.monthlyPriceEur * COMMERCIAL_INCLUDED_ADDON_MONTHS : 0;
  const starterToProAnnualMonthlyDelta = getInterestFreeInstallment(
    Math.max(0, planCatalog.pro.billing.annualTotalEur - planCatalog.starter.billing.annualTotalEur),
    12
  );
  const segmentMiniCases = SEGMENT_CASES.map((segment) => {
    const segmentPlan = planCatalog[segment.planType];
    const segmentMonthly = billingCycle === "annual"
      ? getInterestFreeInstallment(segmentPlan.billing.annualTotalEur, annualFinancingMonths)
      : segmentPlan.billing.monthlyPriceEur;
    const segmentCostPerStudent = Math.round((segmentMonthly / segment.activeStudents) * 100) / 100;
    const segmentPayback = Math.max(1, Math.ceil(segmentMonthly / NET_ENROLLMENT_CONTRIBUTION_EUR));

    return {
      ...segment,
      monthly: segmentMonthly,
      costPerStudent: segmentCostPerStudent,
      payback: segmentPayback,
    };
  });

  const proAnnualBase = planCatalog.pro.billing.annualTotalEur;
  const proAnnualWithFounders = Math.max(0, proAnnualBase - Math.round(proAnnualBase * (FOUNDERS_ANNUAL_PROMO_PERCENT / 100)));
  const proAnnualWithFoundersInstallment = getInterestFreeInstallment(proAnnualWithFounders, annualFinancingMonths);
  const proAnnualSavingsVsMonthly = Math.max(0, planCatalog.pro.billing.monthlyPriceEur * 12 - planCatalog.pro.billing.annualTotalEur);

  const copyFoundersCode = async () => {
    try {
      await navigator.clipboard.writeText(FOUNDERS_PROMO_CODE);
      setFoundersCodeCopied(true);
      toast.success("Código FOUNDERS copiado");
      window.setTimeout(() => setFoundersCodeCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el código. Cópialo manualmente: FOUNDERS");
    }
  };

  const validateStep1 = () => {
    const newErrors: ValidationErrors = {};
    
    if (!schoolName.trim()) {
      newErrors.schoolName = "El nombre de la escuela es obligatorio";
    }
    
    if (!email.trim()) {
      newErrors.email = "El correo electrónico es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Introduce un correo válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: ValidationErrors = {};

    if (!name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (password.length < 8) {
      newErrors.password = "Mínimo 8 caracteres";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (!acceptTerms) {
      newErrors.acceptTerms = "Debes aceptar los términos y condiciones";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
      setErrors({});
    }
  };

  const handleGoToStep3 = () => {
    if (validateStep2()) {
      setStep(3);
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    trackPortalEvent({
      eventName: "submit_register_start",
      category: "funnel",
      metadata: {
        section: "register",
        step,
        selectedPlan,
        selectedOfferKind: selectedOffer.kind,
        billingCycle,
        foundersCode: FOUNDERS_PROMO_CODE,
        promoEnabled: usePromoInSimulator,
        associatedReminderEnabled: isAssociatedSchool,
        selectedAddOns: selectableAddOns
          .filter((addon) => addOns[addon.key])
          .map((addon) => addon.key),
      },
    });

    setIsLoading(true);
    
    try {
      const result = await registerSchool({
        schoolName,
        ownerName: name,
        ownerEmail: email,
        ownerPassword: password,
        city: city || undefined,
      });

      if (result.success) {
        // Store selected plan and add-ons for later billing setup
        if (isNexaPlan(selectedPlan)) {
          localStorage.setItem("selected_plan", selectedPlan);
        } else {
          localStorage.removeItem("selected_plan");
        }
        localStorage.setItem("selected_addons", JSON.stringify(
          selectableAddOns
            .filter((addon) => addOns[addon.key])
            .map((addon) => addon.key)
        ));
        localStorage.setItem("selected_checkout_product", selectedOffer.kind);
        localStorage.setItem("selected_billing_cycle", billingCycle);
        localStorage.setItem("selected_financing_months", String(annualFinancingMonths));
        localStorage.setItem("selected_discount_code", FOUNDERS_PROMO_CODE);
        localStorage.setItem("selected_associated_discount", isAssociatedSchool ? "1" : "0");
        
        toast.success("Registro exitoso. Redirigiendo al panel...");
        navigate("/admin");
      } else {
        toast.error(result.error || "Error al registrar la escuela.");
      }
    } catch (error) {
      toast.error("Error inesperado. Por favor, intenta de nuevo.");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Music className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registra tu escuela</h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <p className="text-center text-sm text-muted-foreground">Paso 1 de 3: Datos de la escuela</p>
              
              <div className="space-y-2">
                <Label htmlFor="schoolName">Nombre de la escuela *</Label>
                <Input
                  id="schoolName"
                  placeholder="Academia de Baile Sol"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className={errors.schoolName ? "border-destructive" : ""}
                />
                {errors.schoolName && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.schoolName}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@escuela.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  placeholder="Madrid"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={handleNextStep}>
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <p className="text-center text-sm text-muted-foreground">Paso 2 de 3: Tu cuenta</p>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  placeholder="María García"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? "border-destructive" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                {errors.confirmPassword && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(v) => setAcceptTerms(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-snug">
                  Acepto los{" "}
                  <Link to="/legal/terms" className="text-primary hover:underline" target="_blank">
                    términos de servicio
                  </Link>
                  {" "}y la{" "}
                  <Link to="/legal/privacy" className="text-primary hover:underline" target="_blank">
                    política de privacidad
                  </Link>
                </Label>
              </div>
              {errors.acceptTerms && (
                <div className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.acceptTerms}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                </Button>
                <Button type="button" onClick={handleGoToStep3} className="flex-1">
                  Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <p className="text-center text-sm text-muted-foreground">Paso 3 de 3: Elige tu plan</p>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Desde {fromSixInstallments}€/mes en 6 cuotas</p>
                <p className="mt-1 text-xs text-muted-foreground">Financiación sin interés y activación inmediata.</p>
              </div>

              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Mejor descuento autoaplicado</p>
                    <p className="text-xs text-emerald-700">
                      Aplicamos automáticamente FOUNDERS: {FOUNDERS_MONTHLY_PROMO_PERCENT}% en mensual o {FOUNDERS_ANNUAL_PROMO_PERCENT}% en financiación sin interés.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="gap-2 border-emerald-500 text-emerald-700" onClick={() => void copyFoundersCode()}>
                    {foundersCodeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {foundersCodeCopied ? "Copiado" : "Copiar etiqueta"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Facturación</Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      billingCycle === "monthly"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      billingCycle === "annual"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Financiación sin interés
                  </button>
                </div>
                {billingCycle === "annual" ? (
                  <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-border p-1">
                    <button
                      type="button"
                      onClick={() => setAnnualFinancingMonths(3)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                        annualFinancingMonths === 3
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      3 meses
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnualFinancingMonths(6)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                        annualFinancingMonths === 6
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      6 meses
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnualFinancingMonths(12)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                        annualFinancingMonths === 12
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      12 meses
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Planes disponibles</Label>
                {offers.map((offer) => {
                  const isSelected = selectedPlan === offer.id;
                  const displayPrice = billingCycle === "annual"
                    ? getInterestFreeInstallment(offer.annualTotalEur, annualFinancingMonths)
                    : offer.monthlyPriceEur;

                  return (
                  <div
                    key={offer.id}
                    onClick={() => {
                      setSelectedPlan(offer.id);
                      trackPortalEvent({
                        eventName: "click_pricing_plan",
                        category: "funnel",
                        metadata: {
                          section: "register",
                          planType: offer.id,
                          planName: offer.name,
                          billingCycle,
                          monthlyPriceEur: offer.monthlyPriceEur,
                        },
                      });
                    }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{offer.name}</p>
                          {offer.highlighted ? (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">Recomendado</span>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{offer.studentsLabel}</p>
                        <p className="text-xs text-muted-foreground">{offer.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{displayPrice}€/mes</p>
                        {billingCycle === "annual" ? (
                          <p className="text-xs text-muted-foreground">{formatAnnualFinancingLabel(offer.annualTotalEur)}</p>
                        ) : null}
                        {billingCycle === "annual" && offer.annualSavingsLabel ? (
                          <p className="text-xs font-medium text-emerald-600">{offer.annualSavingsLabel}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              {selectedNexaPlan ? (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Add-ons opcionales</Label>
                  {selectableAddOns.length === 0 ? (
                    <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                      Este plan ya incluye los add-ons de autoservicio disponibles.
                    </p>
                  ) : (
                    selectableAddOns.map(({ key, label, monthlyPriceEur, starterOnly }) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition"
                      >
                        <Checkbox
                          checked={addOns[key] ?? false}
                          onCheckedChange={(checked) =>
                            setAddOns({ ...addOns, [key]: checked === true })
                          }
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          {starterOnly ? <p className="text-xs text-muted-foreground">Disponible en Starter</p> : null}
                        </div>
                        <p className="text-sm font-semibold text-primary">+{monthlyPriceEur}€</p>
                      </label>
                    ))
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Los add-ons de Nexa no aplican para {selectedOffer.name}.
                </div>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={isAssociatedSchool} onCheckedChange={(checked) => setIsAssociatedSchool(checked === true)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Soy escuela asociada</p>
                    <p className="text-xs text-amber-700">
                      Recuerda aplicar el código de asociado ({ASSOCIATED_PRO_ANNUAL_DISCOUNT_PERCENT}% no aplicable junto a otros descuentos).
                    </p>
                  </div>
                </label>
              </div>

              <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-2">Resumen final estimado</p>
                <label className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={usePromoInSimulator} onCheckedChange={(checked) => setUsePromoInSimulator(checked === true)} />
                  Simular con promo FOUNDERS
                </label>
                <div className="space-y-1.5 text-sm text-foreground">
                  <div className="flex items-center justify-between">
                    <span>Subtotal {billingCycle === "annual" ? "anual" : "mensual"}</span>
                    <span>{billingCycle === "annual" ? `${annualFinancedSubtotal}€/mes (${annualFinancingMonths} cuotas)` : `${monthlySubtotal}€/mes`}</span>
                  </div>
                  {billingCycle === "annual" && annualSavingsAmount > 0 ? (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>Ahorro por facturación anual</span>
                      <span>-{annualSavingsAmount}€</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Descuento FOUNDERS ({foundersPercent}%)</span>
                    <span>-{simulatorDiscountAmount}€</span>
                  </div>
                </div>
                <div className="mt-3 border-t border-primary/20 pt-3">
                  <p className="text-xs text-muted-foreground">
                    {billingCycle === "annual"
                      ? `Cuota hoy (${annualFinancingMonths} meses):`
                      : "Total estimado del primer mes (mensual):"}
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {billingCycle === "annual" ? `${annualFinancedSimulatorTotal}€/mes` : `${simulatorTotal}€/mes`}
                  </p>
                  {billingCycle === "annual" ? (
                    <p className="mt-1 text-xs text-muted-foreground">Total anual (secundario): {annualSubtotal}€</p>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  En Pro anual pagarías {proAnnualWithFoundersInstallment}€/mes ({annualFinancingMonths} cuotas) con FOUNDERS y ahorrarías {proAnnualSavingsVsMonthly}€ frente a Pro mensual.
                </p>
                {isAssociatedSchool ? (
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    Escuela asociada: recuerda aplicar también el código de {ASSOCIATED_PRO_ANNUAL_DISCOUNT_PERCENT}% para Pro anual.
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">Percepción de valor</p>
                <div className="mt-2 space-y-1 text-sm text-emerald-900">
                  <p>
                    Coste por alumno activo:{" "}
                    <span className="font-semibold">
                      {costPerActiveStudent === null ? "N/A para este producto" : `${costPerActiveStudent}€/mes`}
                    </span>
                  </p>
                  <p>
                    Coste operativo equivalente:{" "}
                    <span className="font-semibold">{equivalentAdminHours} horas administrativas/mes</span>
                  </p>
                  {billingCycle === "annual" ? (
                    <p>
                      Ahorro acumulado:{" "}
                      <span className="font-semibold">ahorras {savingsIn12Months}€ en 12 meses vs mensual</span>
                    </p>
                  ) : null}
                  <p>
                    Payback estimate:{" "}
                    <span className="font-semibold">se amortiza con {paybackEnrollments} matrículas nuevas/mes</span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-indigo-300 bg-indigo-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-indigo-900">Plan advisor</p>
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
                    Cuota estimada: <span className="font-semibold">{advisorInstallment}€/mes</span>
                  </p>
                  <p>
                    Ahorro esperado: <span className="font-semibold">{advisorAnnualSavings}€ en 12 meses vs mensual</span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-sky-300 bg-sky-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-sky-900">Incentivos comerciales</p>
                  {annualIncentivesActive ? (
                    <span className="text-xs font-semibold text-sky-900">Precio protegido 12 meses si activas anual esta semana (hasta {annualPromoWeekDeadlineLabel})</span>
                  ) : (
                    <span className="text-xs font-semibold text-sky-900">Activa anual para desbloquear incentivos exclusivos</span>
                  )}
                </div>
                <ul className="mt-2 space-y-1 text-sm text-sky-900">
                  <li>• Bono de onboarding premium incluido solo en anual.</li>
                  <li>• Garantía de satisfacción de {COMMERCIAL_GUARANTEE_DAYS} días.</li>
                  {annualIncentivesActive ? (
                    <li>• Add-on incluido {COMMERCIAL_INCLUDED_ADDON_MONTHS} meses: {annualIncludedAddon.label} (valor {annualIncludedAddonSavings}€).</li>
                  ) : null}
                  <li>
                    • Upgrade sin penalización: empieza en Starter anual y sube a Pro con diferencia prorrateada
                    (desde {starterToProAnnualMonthlyDelta}€/mes de diferencia anualizada).
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Mini-casos por segmento</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {segmentMiniCases.map((segment) => (
                    <div key={segment.key} className="rounded-md border border-border bg-background p-3 text-xs">
                      <p className="font-semibold text-foreground">{segment.title}</p>
                      <p className="mt-1 text-muted-foreground">{planCatalog[segment.planType].name} · {segment.activeStudents} alumnos activos</p>
                      <p className="mt-2 text-foreground">Cuota: <span className="font-semibold">{segment.monthly}€/mes</span></p>
                      <p className="text-muted-foreground">Coste/alumno: {segment.costPerStudent}€/mes</p>
                      <p className="text-muted-foreground">Payback: {segment.payback} matrículas/mes</p>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Activar con cuota mensual
                  </Button>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p>Sin comisiones ocultas</p>
                  <p>Sin interés</p>
                  <p>Cambio de plan prorrateado</p>
                </div>
                <details className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">Ver condiciones legales</summary>
                  <div className="mt-2">
                    <p>
                      Al activar aceptas los{" "}
                      <Link to="/legal/terms" className="text-primary hover:underline" target="_blank">
                        términos de servicio
                      </Link>
                      {" "}y la{" "}
                      <Link to="/legal/privacy" className="text-primary hover:underline" target="_blank">
                        política de privacidad
                      </Link>
                      .
                    </p>
                  </div>
                </details>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== 3 && (
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
