import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackPortalEvent } from "@/lib/portalTelemetry";
import { formatAnnualFinancingLabel, formatEuro, getInterestFreeInstallment, planCatalog } from "@/lib/commercialCatalog";
import { activateDemoAdminSession, DEMO_ADMIN_SLUG } from "@/lib/demoAdmin";

const proPlan = planCatalog.pro;
const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&focus=integrated-web&trial=14d&source=hero";
const HERO_DEMO_ADMIN_HREF = `/admin?demo=${DEMO_ADMIN_SLUG}`;

const benefits = [
  "Ahorra horas cada semana",
  "Automatiza tareas clave",
  "Haz crecer tu escuela sin complicaciones",
];

export function Hero() {
  const handlePrimaryClick = () => {
    trackPortalEvent({
      eventName: "click_cta_primary",
      category: "funnel",
      metadata: {
        section: "hero",
        ctaLabel: "Activar con cuota mensual",
        destination: PRO_ANNUAL_CTA_HREF,
      },
    });
  };

  const handleDemoClick = () => {
    activateDemoAdminSession(DEMO_ADMIN_SLUG);
    trackPortalEvent({
      eventName: "click_cta_secondary",
      category: "funnel",
      metadata: {
        section: "hero",
        ctaLabel: "Ver cómo funciona",
        destination: HERO_DEMO_ADMIN_HREF,
      },
    });
  };

  return (
    <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-background to-background" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/4" />

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Menos gestión, más enseñanza
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-foreground leading-[1.1]">
              Todo tu centro,{" "}
              <span className="text-primary">en un solo sistema.</span>
            </h1>

            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-lg">
              Gestiona alumnos, clases, pagos y comunicación desde un único lugar.
              {/* Desde {formatEuro(getInterestFreeInstallment(proPlan.billing.annualTotalEur, 6))}/mes en 6 cuotas.  */}
              Desde {formatEuro(proPlan.billing.annualEffectiveMonthlyPriceEur)}/mes o {formatEuro(proPlan.billing.annualTotalEur)} al año con ahorro incluido.
              Financiación sin interés y prueba gratis de 14 días.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="h-12 rounded-xl px-7 text-base font-semibold shadow-md hover:shadow-lg" asChild>
                <Link to={PRO_ANNUAL_CTA_HREF} onClick={handlePrimaryClick}>
                  Activar con cuota mensual
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded-xl px-7 text-base" asChild>
                <Link to={HERO_DEMO_ADMIN_HREF} onClick={handleDemoClick}>
                  Ver cómo funciona
                </Link>
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{formatAnnualFinancingLabel(proPlan.billing.annualTotalEur)}</span>
              <span className="text-border">|</span>
              <span className="line-through opacity-60">{formatEuro(proPlan.billing.monthlyPriceEur)}/mes</span>
              <span className="text-success font-medium">{proPlan.billing.annualSavingsLabel}</span>
            </div>

            <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
              <p>Sin comisiones ocultas</p>
              <p>Sin interés</p>
              <p>Cambio de plan prorrateado</p>
            </div>

            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-muted-foreground">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 text-[11px] text-muted-foreground font-mono">app.nexa/admin</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Alumnos activos", value: "412" },
                    { label: "Matrículas hoy", value: "8" },
                    { label: "Ocupación media", value: "91%" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-medium text-foreground mb-2">Horario semanal</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {["Lun", "Mar", "Mié", "Jue", "Vie"].map((d, i) => (
                      <div key={d} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground text-center">{d}</p>
                        {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
                          <div key={j} className="h-5 rounded bg-primary/10 border border-primary/20" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-medium text-foreground mb-2">Últimas matrículas</p>
                  <div className="space-y-1.5">
                    {["María García — Ballet Avanzado", "Carlos López — Jazz Moderno", "Ana Ruiz — Hip Hop Kids"].map((e) => (
                      <div key={e} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{e}</span>
                        <span className="text-success text-[10px] font-medium">Confirmada</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
