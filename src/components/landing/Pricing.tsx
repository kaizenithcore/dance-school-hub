import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Sparkles, Users, TrendingUp, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { commercialCatalog, formatEuro, getInterestFreeInstallment, planCatalog, planOrder, type PlanType } from "@/lib/commercialCatalog";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&trial=14d&source=pricing";

interface Plan {
  planType: PlanType;
  name: string;
  monthlyPriceEur: number;
  annualTotalEur: number;
  desc: string;
  valueFeatures: string[];
  cta: string;
  ctaHref: string;
  ctaExternal?: boolean;
  highlighted?: boolean;
  savings?: string;
}

function getAdvisorRecommendation(students: number): { recommendedPlan: PlanType; studentsHint: string } {
  if (students < 200) return { recommendedPlan: "starter", studentsHint: "Menos de 200 alumnos" };
  if (students < 700) return { recommendedPlan: "pro", studentsHint: "Entre 200 y 699 alumnos" };
  return { recommendedPlan: "enterprise", studentsHint: "700 alumnos o más" };
}

const AVERAGE_ENROLLMENT_FEE = 45;

const plans: Plan[] = planOrder.map((planType) => {
  const plan = planCatalog[planType];
  const valueDescriptions: Record<PlanType, { desc: string; features: string[] }> = {
    starter: {
      desc: "Para empezar a organizar tu academia",
      features: [
        "Gestión básica de alumnos y clases",
        "Matrícula online",
        "Portal del alumno limitado",
        "Web básica incluida",
      ],
    },
    pro: {
      desc: "La forma más eficiente de gestionar y crecer",
      features: [
        "Todo en Starter",
        "Automatizaciones completas",
        "Comunicación masiva",
        "Portal completo (Nexa Club)",
        "Sistema completo de gestión + captación",
      ],
    },
    enterprise: {
      desc: "Control total para academias avanzadas",
      features: [
        "Todo en Pro",
        "Multi-sede",
        "Roles avanzados",
        "Soporte prioritario",
      ],
    },
  };
  return {
    planType,
    name: plan.name,
    monthlyPriceEur: plan.billing.monthlyPriceEur,
    annualTotalEur: plan.billing.annualTotalEur,
    desc: valueDescriptions[planType].desc,
    savings: plan.billing.annualSavingsLabel,
    valueFeatures: valueDescriptions[planType].features,
    cta: planType === "enterprise" ? plan.cta.label : "Probar gratis",
    ctaHref: planType === "enterprise" ? plan.cta.href : PRO_ANNUAL_CTA_HREF,
    ctaExternal: planType === "enterprise" ? plan.cta.external : false,
    highlighted: plan.highlighted,
  };
});

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [advisorStudents, setAdvisorStudents] = useState(260);
  const advisor = getAdvisorRecommendation(advisorStudents);
  const advisorPlan = planCatalog[advisor.recommendedPlan];
  const advisorMonthly = annual ? advisorPlan.billing.annualEffectiveMonthlyPriceEur : advisorPlan.billing.monthlyPriceEur;
  const costPerStudent = advisorStudents > 0 ? advisorMonthly / advisorStudents : 0;
  const paybackEnrollments = Math.ceil(advisorMonthly / AVERAGE_ENROLLMENT_FEE);

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
      },
    });
  };

  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Planes claros, sin sorpresas
          </h2>
          <p className="mt-4 text-muted-foreground">
            Elige el plan que se adapta a tu academia. Todos incluyen prueba gratuita de 14 días.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "text-sm font-medium px-5 py-2.5 rounded-full transition-colors",
              !annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "text-sm font-medium px-5 py-2.5 rounded-full transition-colors",
              annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Anual
            <span className="ml-1.5 text-[10px] font-bold opacity-80">Ahorra 17%</span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => {
            const isAdvisorRecommended = plan.planType === advisor.recommendedPlan;
            const displayPrice = annual
              ? formatEuro(plan.annualTotalEur / 12)
              : formatEuro(plan.monthlyPriceEur);

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "rounded-2xl border p-8 flex flex-col relative transition-all duration-300",
                  plan.highlighted
                    ? "border-primary bg-card shadow-xl ring-1 ring-primary/20 scale-[1.02]"
                    : "border-border bg-card",
                  isAdvisorRecommended && !plan.highlighted && "ring-2 ring-primary/20 shadow-lg"
                )}
              >
                {/* Badges */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {plan.highlighted && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground whitespace-nowrap">
                      Más popular
                    </span>
                  )}
                  {isAdvisorRecommended && (
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground whitespace-nowrap flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Recomendado
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{displayPrice}</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
                {annual && plan.savings && (
                  <p className="mt-1 text-xs font-medium text-success">{plan.savings}</p>
                )}
                <p className="mt-3 text-sm text-muted-foreground">{plan.desc}</p>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.valueFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button className="mt-8 w-full" variant={plan.highlighted ? "default" : "outline"} size="lg" asChild>
                  {plan.ctaExternal ? (
                    <a href={plan.ctaHref} onClick={() => handlePlanClick(plan)}>{plan.cta}<ArrowRight className="ml-1 h-4 w-4" /></a>
                  ) : (
                    <Link to={plan.ctaHref} onClick={() => handlePlanClick(plan)}>{plan.cta}<ArrowRight className="ml-1 h-4 w-4" /></Link>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Plan Advisor */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Calculator className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">¿Qué plan necesito?</h3>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
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
                aria-label="Cantidad de alumnos"
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Plan recomendado</p>
                <p className="text-lg font-bold text-primary mt-1">{advisorPlan.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coste por alumno</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {costPerStudent < 0.01 ? "<0,01€" : formatEuro(Math.round(costPerStudent * 100) / 100)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Se amortiza con</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {paybackEnrollments}
                  <span className="text-xs font-normal text-muted-foreground ml-1">matrículas</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
