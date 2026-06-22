import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles, Users, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { buildRegisterHref, formatEuro, planCatalog, planOrder, type PlanType } from "@/lib/commercialCatalog";
import { trackPortalEvent } from "@/lib/portalTelemetry";

interface Plan {
  planType: PlanType;
  name: string;
  monthlyPriceEur: number;
  annualTotalEur: number;
  desc: string;
  audience: string;
  automationLevel: string;
  businessControl: string;
  scalability: string;
  valueFeatures: string[];
  cta: string;
  ctaHref: string;
  ctaExternal?: boolean;
  highlighted?: boolean;
  savings?: string;
}

interface ComparisonRow {
  label: string;
  values: Record<PlanType, string>;
}

function getPlanCtaHref(planType: PlanType, annual: boolean) {
  return buildRegisterHref("pricing", { planType, billing: annual ? "annual" : "monthly" });
}

function getAdvisorRecommendation(students: number): { recommendedPlan: PlanType; studentsHint: string } {
  if (students <= 220) return { recommendedPlan: "starter", studentsHint: "Hasta 220 alumnos" };
  if (students <= 900) return { recommendedPlan: "pro", studentsHint: "Entre 221 y 900 alumnos" };
  return { recommendedPlan: "enterprise", studentsHint: "Mas de 900 alumnos" };
}

const comparisonRows: ComparisonRow[] = [
  {
    label: "Rango recomendado de alumnos",
    values: {
      starter: "Hasta 220",
      pro: "221-900",
      enterprise: "+900 o multi-sede",
    },
  },
  {
    label: "Matrícula online y experiencia de captación",
    values: {
      starter: "Landing basica + formulario",
      pro: "Experiencia optimizada de matricula",
      enterprise: "Experiencia optimizada + personalizacion",
    },
  },
  {
    label: "Automatizaciones operativas",
    values: {
      starter: "No incluidas",
      pro: "Renovaciones + lista de espera",
      enterprise: "Automatizacion avanzada a escala",
    },
  },
  {
    label: "Comunicacion con alumnos",
    values: {
      starter: "Basica",
      pro: "Masiva y segmentada",
      enterprise: "Masiva + flujos avanzados",
    },
  },
  {
    label: "Portal del alumno",
    values: {
      starter: "Limitado",
      pro: "Completo (Nexa Club)",
      enterprise: "Completo + control avanzado",
    },
  },
  {
    label: "Analitica de negocio",
    values: {
      starter: "Basica",
      pro: "Clara para decisiones",
      enterprise: "Avanzada y de control total",
    },
  },
  {
    label: "Estructura y gobierno",
    values: {
      starter: "Sede unica",
      pro: "Sede unica optimizada",
      enterprise: "Multi-sede + roles avanzados",
    },
  },
  {
    label: "Acompañamiento",
    values: {
      starter: "Soporte estandar",
      pro: "Soporte estandar + guidance",
      enterprise: "Soporte prioritario + onboarding personalizado",
    },
  },
];

const plans: Plan[] = planOrder.map((planType) => {
  const plan = planCatalog[planType];
  const valueDescriptions: Record<PlanType, {
    desc: string;
    audience: string;
    automationLevel: string;
    businessControl: string;
    scalability: string;
    features: string[];
  }> = {
    starter: {
      desc: "Digitaliza la operación y trabaja con orden desde el primer mes",
      audience: "Academias que quieren operar con base sólida",
      automationLevel: "Básico",
      businessControl: "Operativo",
      scalability: "Preparada para crecer",
      features: [
        "Gestión de alumnos y clases",
        "Matrícula online con landing básica",
        "Horarios y pagos básicos",
        "Comunicación básica",
        "Portal del alumno limitado",
      ],
    },
    pro: {
      desc: "Escala con automatización y decisiones claras de negocio",
      audience: "Academias medianas y grandes en crecimiento",
      automationLevel: "Alto",
      businessControl: "Estratégico",
      scalability: "Escala sin fricción",
      features: [
        "Todo en Starter",
        "Automatización de renovaciones y listas de espera",
        "Comunicación masiva",
        "Analítica clara de negocio",
        "Portal del alumno completo (Nexa Club)",
      ],
    },
    enterprise: {
      desc: "Control total para estructuras complejas y multi-sede",
      audience: "Centros con operación avanzada y gran volumen",
      automationLevel: "Muy alto",
      businessControl: "Total",
      scalability: "Multi-sede y alta exigencia",
      features: [
        "Todo en Pro",
        "Multi-sede",
        "Roles avanzados",
        "Analítica avanzada",
        "Soporte prioritario",
        "Onboarding personalizado",
      ],
    },
  };
  return {
    planType,
    name: plan.name,
    monthlyPriceEur: plan.billing.monthlyPriceEur,
    annualTotalEur: plan.billing.annualTotalEur,
    desc: valueDescriptions[planType].desc,
    audience: valueDescriptions[planType].audience,
    automationLevel: valueDescriptions[planType].automationLevel,
    businessControl: valueDescriptions[planType].businessControl,
    scalability: valueDescriptions[planType].scalability,
    savings: plan.billing.annualSavingsLabel,
    valueFeatures: valueDescriptions[planType].features,
    cta: planType === "starter" ? "Empezar con Starter" : planType === "pro" ? "Empezar con Pro" : "Hablar con ventas",
    ctaHref: planType === "enterprise" ? plan.cta.href : getPlanCtaHref(planType, true),
    ctaExternal: planType === "enterprise" ? plan.cta.external : false,
    highlighted: plan.highlighted,
  };
});

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [advisorStudents, setAdvisorStudents] = useState(320);
  const advisor = getAdvisorRecommendation(advisorStudents);
  const advisorPlan = planCatalog[advisor.recommendedPlan];
  const advisorMonthly = annual
    ? Math.round(advisorPlan.billing.annualTotalEur / 12)
    : advisorPlan.billing.monthlyPriceEur;
  const advisorCostPerStudent = advisorStudents > 0
    ? Math.round((advisorMonthly / advisorStudents) * 100) / 100
    : 0;

  const handlePlanClick = (plan: Plan) => {
    trackPortalEvent({
      eventName: "click_pricing_plan",
      category: "funnel",
      metadata: {
        section: "pricing",
        planType: plan.planType,
        planName: plan.name,
        billingMode: annual ? "annual" : "monthly",
        destination: plan.planType === "enterprise" ? plan.ctaHref : getPlanCtaHref(plan.planType, annual),
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
            El sistema que tu academia se merece
          </h2>
          <p className="mt-4 text-muted-foreground">
            Tres planes, una decision clara: operar, escalar u optimizar. Sin addons infinitos, con una base solida para crecer.
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
            <span className="ml-1.5 text-[10px] font-bold opacity-80">2 meses gratis</span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => {
            const displayPrice = annual
              ? formatEuro(Math.round(plan.annualTotalEur / 12))
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
                    : "border-border bg-card"
                )}
              >
                {/* Badges */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {plan.highlighted && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground whitespace-nowrap">
                      Plan recomendado
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
                <p className="mt-2 text-xs text-primary font-medium">{plan.audience}</p>

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
                    <Link to={getPlanCtaHref(plan.planType, annual)} onClick={() => handlePlanClick(plan)}>{plan.cta}<ArrowRight className="ml-1 h-4 w-4" /></Link>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Impact comparison */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 max-w-5xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-muted/30">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Comparativa rapida para decidir en menos de 30 segundos</h3>
              <p className="mt-1 text-sm text-muted-foreground">Mismo sistema, distinto nivel de madurez operativa.</p>
            </div>

            <div className="overflow-x-auto">
              <div className="grid grid-cols-4 text-sm min-w-[920px]">
                <div className="p-4 font-semibold text-foreground border-b border-border">Criterio</div>
                {plans.map((plan) => (
                  <div
                    key={`head-${plan.planType}`}
                    className={cn(
                      "p-4 font-semibold border-b border-border text-center",
                      plan.highlighted ? "bg-primary/5 text-primary" : "text-foreground"
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {plan.highlighted && <Sparkles className="h-3.5 w-3.5" />}
                      {plan.name}
                    </span>
                  </div>
                ))}

                {comparisonRows.map((row, rowIndex) => {
                  const isLastRow = rowIndex === comparisonRows.length - 1;
                  return (
                    <div key={`row-${row.label}`} className="contents">
                      <div className={cn("p-4 text-muted-foreground", !isLastRow && "border-b border-border")}>
                        {row.label}
                      </div>
                      {plans.map((plan) => (
                        <div
                          key={`${row.label}-${plan.planType}`}
                          className={cn(
                            "p-4 text-center text-foreground",
                            !isLastRow && "border-b border-border",
                            plan.highlighted && "bg-primary/5"
                          )}
                        >
                          {row.values[plan.planType]}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Sistema modular dentro de un todo: activas lo que necesitas hoy y todo queda preparado para cuando lo necesites.
              </p>
              <div className="mt-3 flex justify-center">
                <Button asChild>
                  <Link to={getPlanCtaHref("pro", annual)}>
                    Empezar con Pro
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Calculator className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Plan advisor por numero de alumnos</h3>
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
                max={1500}
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
                <p className="text-[11px] text-muted-foreground mt-1">{advisor.studentsHint}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inversion estimada</p>
                <p className="text-lg font-bold text-foreground mt-1">{formatEuro(advisorMonthly)}/mes</p>
                <p className="text-[11px] text-muted-foreground mt-1">{annual ? "Con anual (2 meses gratis)" : "Con mensual"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coste por alumno</p>
                <p className="text-lg font-bold text-foreground mt-1">{formatEuro(advisorCostPerStudent)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Escalable y controlado</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
