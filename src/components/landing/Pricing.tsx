import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { commercialCatalog, formatEuro, getMinimumExtraStudentBlockPriceEur, planCatalog, planOrder, subscriptionAddonCatalog, type PlanType } from "@/lib/commercialCatalog";
import { trackPortalEvent } from "@/lib/portalTelemetry";

interface Plan {
  planType: PlanType;
  name: string;
  annualPrice: string;
  annualTotal: string;
  monthlyPrice: string;
  desc: string;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaExternal?: boolean;
  highlighted?: boolean;
  savings?: string;
}

const plans: Plan[] = planOrder.map((planType) => {
  const plan = planCatalog[planType];

  return {
    planType,
    name: plan.name,
    annualPrice: formatEuro(plan.billing.annualEffectiveMonthlyPriceEur),
    annualTotal: `${formatEuro(plan.billing.annualTotalEur)}/año`,
    monthlyPrice: `${formatEuro(plan.billing.monthlyPriceEur)}/mes`,
    desc: plan.limits.marketingLabel,
    savings: plan.billing.annualSavingsLabel,
    features: plan.display.features,
    cta: plan.cta.label,
    ctaHref: plan.cta.href,
    ctaExternal: plan.cta.external,
    highlighted: plan.highlighted,
  };
});

const addonsStarter = [
  `${subscriptionAddonCatalog.renewalAutomation.label}: ${formatEuro(subscriptionAddonCatalog.renewalAutomation.monthlyPriceEur)}/mes`,
  `${subscriptionAddonCatalog.waitlistAutomation.label}: ${formatEuro(subscriptionAddonCatalog.waitlistAutomation.monthlyPriceEur)}/mes`,
];

const addons = [
  `${subscriptionAddonCatalog.customDomain.label}: ${formatEuro(subscriptionAddonCatalog.customDomain.monthlyPriceEur)}/mes`,
  `${subscriptionAddonCatalog.branding.label}: ${formatEuro(subscriptionAddonCatalog.branding.monthlyPriceEur)}/mes`,
  `${subscriptionAddonCatalog.prioritySupport.label}: ${formatEuro(subscriptionAddonCatalog.prioritySupport.monthlyPriceEur)}/mes`,
  `Bloques extra de alumnos desde ${formatEuro(getMinimumExtraStudentBlockPriceEur())}/mes (según el plan)`,
  `${subscriptionAddonCatalog.extraRoles.label}: ${formatEuro(subscriptionAddonCatalog.extraRoles.monthlyPriceEur)}/mes`,
  
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);

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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Precios</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Inviertes en tu escuela, no en una suscripción más
          </h2>
          <p className="mt-4 text-muted-foreground">
            Elige el plan que se adapta al tamaño de tu escuela. El precio escala solo por alumnos activos.
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
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
            Anual
            <span className="ml-1.5 text-[10px] font-bold opacity-80">-17%</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "rounded-2xl border p-7 flex flex-col relative",
                plan.highlighted
                  ? "border-primary bg-card shadow-lg ring-1 ring-primary/20"
                  : "border-border bg-card"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  Recomendado
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {annual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                <span className="text-sm text-muted-foreground">/mes</span>
              </div>
              {annual && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Facturación anual: {plan.annualTotal}</p>
                  {plan.savings && (
                    <p className="text-xs font-medium text-success">{plan.savings}</p>
                  )}
                </div>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>

              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-7 w-full"
                variant={plan.highlighted ? "default" : "outline"}
                size="lg"
                asChild
              >
                {plan.ctaExternal ? (
                  <a href={plan.ctaHref} onClick={() => handlePlanClick(plan)}>{plan.cta}<ArrowRight className="ml-1 h-4 w-4" /></a>
                ) : (
                  <Link to={plan.ctaHref} onClick={() => handlePlanClick(plan)}>{plan.cta}<ArrowRight className="ml-1 h-4 w-4" /></Link>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Value block */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 rounded-2xl border border-primary/20 bg-card p-6 max-w-5xl mx-auto text-center"
        >
          <p className="text-lg font-semibold text-foreground">
            Con solo 5–15 alumnos al mes cubres el coste completo del sistema
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {commercialCatalog.pricingNarrative?.comparison || "Más barato que contratar a un administrativo"}. El retorno de inversión es inmediato: menos gestión, más tiempo para captar y retener alumnos.
          </p>
          {commercialCatalog.pricingNarrative?.launchDiscountStrategy && (
            <p className="mt-2 text-xs font-medium text-primary">{commercialCatalog.pricingNarrative.launchDiscountStrategy}</p>
          )}
        </motion.div>

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
            ¿Ya utilizas ExamSuit? Puedes activar el Plan Pro en un solo paso.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Empieza con exámenes. Escala a gestión completa.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
