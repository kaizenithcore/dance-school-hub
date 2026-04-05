import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Sparkles, Users, TrendingUp, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { commercialCatalog, formatEuro, getInterestFreeInstallment, getMinimumExtraStudentBlockPriceEur, planCatalog, planOrder, subscriptionAddonCatalog, type PlanType } from "@/lib/commercialCatalog";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&focus=integrated-web&trial=14d&source=pricing";

interface Plan {
  planType: PlanType;
  name: string;
  annualPrice: string;
  annualTotalEur: number;
  monthlyPrice: string;
  monthlyPriceEur: number;
  desc: string;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaExternal?: boolean;
  highlighted?: boolean;
  savings?: string;
  strategicHighlights: string[];
  includedStudents: number;
}

function getAdvisorRecommendation(students: number): { recommendedPlan: PlanType; months: 3 | 6 | 12; studentsHint: string } {
  if (students < 200) return { recommendedPlan: "starter", months: 6, studentsHint: "Menos de 200 alumnos" };
  if (students < 700) return { recommendedPlan: "pro", months: 6, studentsHint: "Entre 200 y 699 alumnos" };
  return { recommendedPlan: "enterprise", months: 12, studentsHint: "700 alumnos o más" };
}

const AVERAGE_ENROLLMENT_FEE = 45;

const plans: Plan[] = planOrder.map((planType) => {
  const plan = planCatalog[planType];
  const customDescriptionByPlan: Record<PlanType, string> = {
    starter: "Empieza a organizar tu escuela",
    pro: "La forma más eficiente de gestionar y crecer",
    enterprise: "Control total para escuelas avanzadas",
  };
  return {
    planType,
    name: plan.name,
    annualPrice: formatEuro(plan.billing.annualEffectiveMonthlyPriceEur),
    annualTotalEur: plan.billing.annualTotalEur,
    monthlyPriceEur: plan.billing.monthlyPriceEur,
    monthlyPrice: `${formatEuro(plan.billing.monthlyPriceEur)}/mes`,
    desc: customDescriptionByPlan[planType],
    savings: plan.billing.annualSavingsLabel,
    features: plan.display.features,
    cta: planType === "enterprise" ? plan.cta.label : "Activar con cuota mensual",
    ctaHref: planType === "enterprise" ? plan.cta.href : PRO_ANNUAL_CTA_HREF,
    ctaExternal: planType === "enterprise" ? plan.cta.external : false,
    highlighted: plan.highlighted,
    includedStudents: plan.limits.includedActiveStudents,
    strategicHighlights:
      planType === "starter"
        ? ["Incluye web básica con matrícula online"]
        : planType === "pro"
          ? ["Web básica desde el primer día", "Pack de modernización incluido", "Acceso a web optimizada (incluida o con descuento)"]
          : ["Escalado avanzado de operaciones y captación"],
  };
});

const addonsStarter = [
  `${subscriptionAddonCatalog.renewalAutomation.label}: ${formatEuro(subscriptionAddonCatalog.renewalAutomation.monthlyPriceEur)}/mes`,
  `${subscriptionAddonCatalog.waitlistAutomation.label}: ${formatEuro(subscriptionAddonCatalog.waitlistAutomation.monthlyPriceEur)}/mes`,
];

const addons = [
  `${subscriptionAddonCatalog.customDomain.label}: ${formatEuro(subscriptionAddonCatalog.customDomain.monthlyPriceEur)}/mes`,
  `${subscriptionAddonCatalog.prioritySupport.label}: ${formatEuro(subscriptionAddonCatalog.prioritySupport.monthlyPriceEur)}/mes`,
  `Bloques extra de alumnos desde ${formatEuro(getMinimumExtraStudentBlockPriceEur())}/mes (según el plan)`,
  `${subscriptionAddonCatalog.extraRoles.label}: ${formatEuro(subscriptionAddonCatalog.extraRoles.monthlyPriceEur)}/mes`,
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [annualFinancingMonths, setAnnualFinancingMonths] = useState<1 | 3 | 6>(1);
  const [advisorStudents, setAdvisorStudents] = useState(260);
  const advisor = getAdvisorRecommendation(advisorStudents);
  const advisorPlan = planCatalog[advisor.recommendedPlan];
  const advisorInstallment = getInterestFreeInstallment(advisorPlan.billing.annualTotalEur, advisor.months);
  const advisorSavings = Math.max(0, advisorPlan.billing.monthlyPriceEur * 12 - advisorPlan.billing.annualTotalEur);
  const pricingFromSixInstallments = getInterestFreeInstallment(planCatalog.pro.billing.annualTotalEur, 6);

  const advisorDisplayedPrice = annual
    ? annualFinancingMonths === 1
      ? advisorPlan.billing.annualTotalEur
      : getInterestFreeInstallment(advisorPlan.billing.annualTotalEur, annualFinancingMonths)
    : advisorPlan.billing.monthlyPriceEur;
  const advisorDisplayedPriceSuffix = annual && annualFinancingMonths === 1 ? "/año" : "/mes";
  const advisorComparableMonthlyPrice = annual ? advisorPlan.billing.annualEffectiveMonthlyPriceEur : advisorPlan.billing.monthlyPriceEur;
  const costPerStudent = advisorStudents > 0 ? advisorComparableMonthlyPrice / advisorStudents : 0;
  const paybackEnrollments = Math.ceil(advisorComparableMonthlyPrice / AVERAGE_ENROLLMENT_FEE);

  const handlePlanClick = (plan: Plan) => {
    trackPortalEvent({
      eventName: "click_pricing_plan",
      category: "funnel",
      metadata: {
        section: "pricing",
        planType: plan.planType,
        planName: plan.name,
        billingMode: annual ? "annual" : "monthly",
        destination: plan.ctaHref,
        external: Boolean(plan.ctaExternal),
      },
    });
  };

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Precios</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Inviertes en gestión + captación, no en una suscripción más
          </h2>
          <p className="mt-4 text-muted-foreground">
            Elige el plan que se adapta al tamaño de tu escuela. Todos incluyen web básica con matrícula online.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">
            Desde {formatEuro(pricingFromSixInstallments)}/mes en 6 cuotas
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Financiación sin interés + mejor descuento elegible autoaplicado en checkout.</p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "text-sm font-medium px-4 py-2 rounded-full transition-colors",
              !annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "text-sm font-medium px-4 py-2 rounded-full transition-colors",
              annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Financiación sin interés
            <span className="ml-1.5 text-[10px] font-bold opacity-80">-17%</span>
          </button>
        </div>

        {/* Term selector — directly above cards */}
        <AnimatePresence>
          {annual && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-auto mb-6 max-w-md rounded-xl border border-border bg-card p-2">
                <p className="px-2 pb-2 text-center text-xs text-muted-foreground">Selecciona tu tipo de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 1, label: "Cuota completa" },
                    { value: 3, label: "3 cuotas" },
                    { value: 6, label: "6 cuotas" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAnnualFinancingMonths(option.value as 1 | 3 | 6)}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition",
                        annualFinancingMonths === option.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => {
            const isAdvisorRecommended = plan.planType === advisor.recommendedPlan;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "rounded-2xl border p-7 flex flex-col relative transition-all duration-300",
                  plan.highlighted
                    ? "border-primary bg-card shadow-xl ring-1 ring-primary/20"
                    : "border-border bg-card",
                  isAdvisorRecommended && !plan.highlighted && "ring-2 ring-accent-foreground/20 border-accent-foreground/30 shadow-lg"
                )}
              >
                {/* Badges */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {plan.highlighted && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground whitespace-nowrap">
                      Recomendado
                    </span>
                  )}
                  {isAdvisorRecommended && (
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground whitespace-nowrap flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Advisor recomienda
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {annual
                      ? annualFinancingMonths === 1
                        ? formatEuro(plan.annualTotalEur)
                        : formatEuro(getInterestFreeInstallment(plan.annualTotalEur, annualFinancingMonths))
                      : plan.monthlyPrice}
                  </span>
                  <span className="text-sm text-muted-foreground">{annual ? (annualFinancingMonths === 1 ? "/año" : "/mes") : "/mes"}</span>
                </div>
                {annual && (
                  <div className="mt-1 space-y-0.5">
                    {plan.savings && <p className="text-xs font-medium text-success">{plan.savings}</p>}
                  </div>
                )}
                <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>

                <div className="mt-3 space-y-1.5">
                  {plan.strategicHighlights.map((item) => (
                    <p key={item} className="text-xs font-medium text-primary">Incluye: {item}</p>
                  ))}
                </div>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button className="mt-7 w-full" variant={plan.highlighted ? "default" : "outline"} size="lg" asChild>
                  {plan.ctaExternal ? (
                    <a href={plan.ctaHref} onClick={() => handlePlanClick(plan)}>{plan.cta}<ArrowRight className="ml-1 h-4 w-4" /></a>
                  ) : (
                    <Link to={plan.ctaHref} onClick={() => handlePlanClick(plan)}>{plan.cta}<ArrowRight className="ml-1 h-4 w-4" /></Link>
                  )}
                </Button>

                <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                  <p>Sin comisiones ocultas</p>
                  <p>Sin interés</p>
                  <p>Cambio de plan prorrateado</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Plan Advisor — below cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 max-w-5xl mx-auto"
        >
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Plan Advisor</h3>
                <p className="text-xs text-muted-foreground">Encuentra el plan ideal para tu escuela</p>
              </div>
            </div>

            {/* Slider */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Alumnos activos
                </span>
                <span className="text-lg font-bold text-primary">{advisorStudents}</span>
              </div>
              <input
                type="range"
                min={50}
                max={1200}
                step={10}
                value={advisorStudents}
                onChange={(e) => setAdvisorStudents(Number(e.target.value))}
                className="w-full accent-primary h-2 cursor-pointer"
                aria-label="Cantidad de alumnos de la escuela"
              />
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>Starter &lt;200</span>
                <span>Pro 200–699</span>
                <span>Enterprise 700+</span>
              </div>
            </div>

            {/* Recommendation result */}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {/* Recommended plan */}
              <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 flex flex-col items-center text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground mb-3">
                  <Sparkles className="h-3 w-3" />
                  Recomendado
                </span>
                <p className="text-xl font-bold text-foreground">{advisorPlan.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{advisor.studentsHint}</p>
                <p className="text-2xl font-bold text-primary mt-2">
                  {formatEuro(advisorDisplayedPrice)}<span className="text-sm font-normal text-muted-foreground">{advisorDisplayedPriceSuffix}</span>
                </p>
                {annual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {annualFinancingMonths === 1 ? "pago anual completo" : `en ${annualFinancingMonths} cuotas sin interés`}
                  </p>
                )}
                {advisorSavings > 0 && (
                  <p className="text-xs font-semibold text-success mt-1">Ahorro: {formatEuro(advisorSavings)}/año</p>
                )}
              </div>

              {/* Cost per student */}
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center text-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/50 mb-2">
                  <Users className="h-5 w-5 text-accent-foreground" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coste por alumno</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {costPerStudent < 0.01 ? "<0,01€" : formatEuro(Math.round(costPerStudent * 100) / 100)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">al mes por alumno activo</p>
              </div>

              {/* Payback */}
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center text-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-success/10 mb-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Se amortiza con</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {paybackEnrollments} matrículas
                </p>
                <p className="text-xs text-muted-foreground mt-1">nuevas al mes (media {formatEuro(AVERAGE_ENROLLMENT_FEE)}/matrícula)</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contract details */}
        <details className="mt-6 rounded-2xl border border-border bg-card p-5 max-w-5xl mx-auto text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Ver condiciones de contratación</summary>
          <p className="mt-2">No hay permanencia adicional fuera del periodo pagado. El cambio de plan se calcula con prorrateo automático.</p>
        </details>

        {/* Value block */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 rounded-2xl border border-primary/20 bg-card p-6 max-w-5xl mx-auto text-center"
        >
          <p className="text-lg font-semibold text-foreground">
            Con solo 5–15 alumnos al mes cubres el coste completo del sistema de gestión + captación
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {commercialCatalog.pricingNarrative?.comparison || "Más barato que contratar a un administrativo"}. Menos gestión, más tiempo para captar y retener alumnos.
          </p>
        </motion.div>

        {/* Addons */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 max-w-5xl mx-auto">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Add-ons disponibles para Starter</h3>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {addonsStarter.map((a) => (
              <p key={a} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                {a}
              </p>
            ))}
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 max-w-5xl mx-auto">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Add-ons disponibles para todos</h3>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {addons.map((a) => (
              <p key={a} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                {a}
              </p>
            ))}
          </div>
        </div>

        {/* ExamSuit upsell */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-6 rounded-2xl border border-primary/10 bg-card p-6 max-w-5xl mx-auto text-center"
        >
          <p className="text-sm font-medium text-foreground">
            ¿Ya usas Certifier? Activa Nexa Pro en un solo paso.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Gestiona certificaciones con Certifier. Incluido en Nexa Pro.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild>
              <Link to="/auth/register?plan=pro&billing=annual&product=certifier&trial=14d&source=pricing_certifier">
                Crear cuenta gratis
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
