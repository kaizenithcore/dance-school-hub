import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { commercialCatalog, formatEuro } from "@/lib/commercialCatalog";

const bundleCatalog = (commercialCatalog as any).bundles?.modernizationProBundle;
const creativeServices = (commercialCatalog as any).creativeServices;

const bundleIncludes = [
  { label: "Nexa Pro anual", desc: "Sistema de gestión + captación completo, automatizaciones, portal del alumno" },
  { label: "Implementación completa", desc: "Migración de datos, configuración y puesta en marcha" },
  { label: "Web optimizada (sin coste inicial)", desc: "Página pública diseñada para convertir visitas en matrículas" },
  { label: "Revisión de identidad con Weydi", desc: `Por ${creativeServices?.provider || "Weydi"} — análisis y mejora de tu imagen de marca` },
];

const advantages = [
  "Empiezas con sistema + captación desde el primer mes",
  "Ahorra más de 1.000€ frente a contratar por separado",
  "Un solo interlocutor para todo el proceso",
  "Soporte dedicado durante la implementación",
];

export function ModernizationPack() {
  return (
    <section id="modernization-bundle" className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border-2 border-primary/30 bg-card overflow-hidden max-w-5xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20" />

          {/* Badge */}
          <div className="relative flex justify-center -mt-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg">
              <Sparkles className="h-4 w-4" />
              Oferta recomendada
            </span>
          </div>

          <div className="relative p-8 sm:p-12">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-4">
                <Package className="h-6 w-6 text-primary" />
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                  {bundleCatalog?.label || "Pack Modernización Pro"}
                </h2>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {bundleCatalog?.description || "La forma más rápida de digitalizar tu escuela con todo incluido."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* What's included */}
              <div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-5">
                  Qué incluye el pack
                </h3>
                <ul className="space-y-4">
                  {bundleIncludes.map((item) => (
                    <li key={item.label} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing & CTA */}
              <div className="flex flex-col justify-center">
                <div className="rounded-2xl border border-primary/20 bg-background p-6 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Pago único del pack</p>
                  <p className="text-4xl font-bold text-foreground">
                    {formatEuro(bundleCatalog?.pricing?.oneTimeEur || 1490)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    + Plan Pro anual: {formatEuro(commercialCatalog.plans.pro.billing.annualTotalEur)}/año
                  </p>
                  {bundleCatalog?.firstYearTotalEur && (
                    <div className="mt-3 rounded-lg bg-accent/50 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Primer año completo</p>
                      <p className="text-lg font-bold text-foreground">{formatEuro(bundleCatalog.firstYearTotalEur)}</p>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-success font-medium">
                    {bundleCatalog?.pricing?.note || "Ahorra más de 1.000€"}
                  </p>
                </div>

                <ul className="mt-5 space-y-2">
                  {advantages.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-success shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col gap-2">
                  <Button size="lg" className="h-12 text-base font-semibold" asChild>
                    <Link to="/auth/register">
                      Empezar con el pack
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="mailto:hola@dancehub.es?subject=Consulta%20Pack%20Modernización%20Pro">
                      Solicitar demo
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
