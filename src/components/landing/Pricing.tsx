import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles, Users, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { buildRegisterHref, formatEuro, planCatalog, planOrder, type PlanType } from "@/lib/commercialCatalog";
import { trackPortalEvent } from "@/lib/portalTelemetry";
import { useVocabulary } from "@/lib/vertical/context";

interface Plan {
  planType: PlanType;
  name: string;
  monthlyPriceEur: number;
  annualTotalEur: number;
  desc: string;
  audience: string;
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

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Pricing() {
  const vocabulary = useVocabulary();
  const s = vocabulary.students;
  const S = cap(s);
  const centerS = vocabulary.center + "s";
  const centerSCap = cap(centerS);

  const [annual, setAnnual] = useState(true);
  const [advisorStudents, setAdvisorStudents] = useState(320);

  function getAdvisorRecommendation(students: number): { recommendedPlan: PlanType; studentsHint: string } {
    if (students <= 220) return { recommendedPlan: "starter", studentsHint: `Hasta 220 ${s}` };
    if (students <= 900) return { recommendedPlan: "pro", studentsHint: `Entre 221 y 900 ${s}` };
    return { recommendedPlan: "enterprise", studentsHint: `Más de 900 ${s}` };
  }

  const advisor = getAdvisorRecommendation(advisorStudents);
  const advisorPlan = planCatalog[advisor.recommendedPlan];
  const advisorMonthly = annual
    ? Math.round(advisorPlan.billing.annualTotalEur / 12)
    : advisorPlan.billing.monthlyPriceEur;
  const advisorCostPerStudent = advisorStudents > 0
    ? Math.round((advisorMonthly / advisorStudents) * 100) / 100
    : 0;

  const comparisonRows: ComparisonRow[] = [
    {
      label: `${S} activos incluidos`,
      values: { starter: "Hasta 200", pro: "Hasta 500", enterprise: "Hasta 2.000" },
    },
    {
      label: "Matrícula online + landing pública",
      values: { starter: "✓ Incluida", pro: "✓ Incluida", enterprise: "✓ Incluida" },
    },
    {
      label: "Renovaciones automáticas de matrícula",
      values: { starter: "✓ Incluida", pro: "✓ Incluida", enterprise: "✓ Incluida" },
    },
    {
      label: "Lista de espera inteligente",
      values: { starter: "✓ Incluida", pro: "✓ Incluida", enterprise: "✓ Incluida" },
    },
    {
      label: "Comunicación masiva por email",
      values: { starter: "✓ Incluida", pro: "✓ Incluida", enterprise: "✓ Incluida" },
    },
    {
      label: `Portal del ${vocabulary.student}`,
      values: { starter: "✓ Completo", pro: "✓ Completo", enterprise: "✓ Completo" },
    },
    {
      label: "Soporte",
      values: {
        starter: "Estándar",
        pro: "✓ Prioritario incluido",
        enterprise: "✓ Prioritario + puesta a punto",
      },
    },
  ];

  const plans: Plan[] = planOrder.map((planType) => {
    const plan = planCatalog[planType];
    const valueDescriptions: Record<PlanType, { desc: string; audience: string; features: string[] }> = {
      starter: {
        desc: "Todo lo que necesitas para operar tu centro sin caos desde el primer día",
        audience: `${centerSCap} de hasta 200 ${s}`,
        features: [
          `${S}, clases y horarios gestionados`,
          "Matrícula online con formulario configurable",
          "Renovaciones y lista de espera automáticas",
          "Comunicación masiva por email",
          `Portal del ${vocabulary.student} completo`,
          "Pagos, facturas y recibos",
        ],
      },
      pro: {
        desc: `Escala sin límites con capacidad para más ${s} y soporte prioritario incluido`,
        audience: `${centerSCap} de hasta 500 ${s}`,
        features: [
          "Todo en Starter",
          `Hasta 500 ${s} activos`,
          `Bloques de 100 ${s} extra disponibles`,
          "Soporte prioritario por email incluido",
        ],
      },
      enterprise: {
        desc: "Control total para estructuras complejas y multi-sede",
        audience: "Centros con operación avanzada y gran volumen",
        features: [
          "Todo en Pro",
          "Multi-sede",
          "Roles avanzados",
          "Analítica avanzada",
          "Soporte prioritario",
          "Puesta a punto incluida",
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
      savings: plan.billing.annualSavingsLabel,
      valueFeatures: valueDescriptions[planType].features,
      cta: planType === "starter" ? "Empezar con Starter" : planType === "pro" ? "Empezar con Pro" : "Hablar con ventas",
      ctaHref: planType === "enterprise" ? plan.cta.href : getPlanCtaHref(planType, true),
      ctaExternal: planType === "enterprise" ? plan.cta.external : false,
      highlighted: plan.highlighted,
    };
  });

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
            El sistema que tu centro se merece
          </h2>
          <p className="mt-4 text-muted-foreground">
            Tres planes, una decisión clara: operar, escalar u optimizar. Sin addons infinitos, con una base sólida para crecer.
          </p>
        </motion.div>

        {/* Plan advisor */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 max-w-2xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">¿Cuántos {s} tienes?</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {S} activos
                </span>
                <span className="text-lg font-bold text-primary">{advisorStudents}</span>
              </div>
              <input
                type="range" min={50} max={600} step={10}
                value={advisorStudents}
                onChange={(e) => setAdvisorStudents(Number(e.target.value))}
                className="w-full accent-primary h-2 cursor-pointer"
                aria-label={`Cantidad de ${s}`}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                <span>50</span><span>300</span><span>600+</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
                <p className="text-xs text-muted-foreground">Plan recomendado</p>
                <p className="text-lg font-bold text-primary mt-1">{advisorPlan.name}</p>
              </div>
              <div className="rounded-xl bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">Coste por {vocabulary.student}</p>
                <p className="text-lg font-bold text-foreground mt-1">{formatEuro(advisorCostPerStudent)}<span className="text-xs font-normal text-muted-foreground">/mes</span></p>
              </div>
            </div>
          </div>
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
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto items-start">
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

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 max-w-5xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-muted/30">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Comparativa rápida para decidir en menos de 30 segundos</h3>
              <p className="mt-1 text-sm text-muted-foreground">Mismo sistema, distinto nivel de madurez operativa.</p>
            </div>

            <div className="overflow-x-auto">
              <div className="grid grid-cols-3 text-sm min-w-[560px]">
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
      </div>
    </section>
  );
}
