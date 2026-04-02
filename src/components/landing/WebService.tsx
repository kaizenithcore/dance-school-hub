import { motion } from "framer-motion";
import { Globe, Link2, CreditCard, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commercialCatalog, formatEuro } from "@/lib/commercialCatalog";
import { Link } from "react-router-dom";

const webCatalog = commercialCatalog.professionalServices as Record<string, any>;
const integratedWeb = webCatalog.integratedWebsite;
const standaloneWeb = webCatalog.standaloneWebsite;
const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&focus=integrated-web&trial=14d&source=web_service";

const integratedFeatures = (integratedWeb?.includes as string[] | undefined) || [
  "Página pública profesional",
  "Clases y horarios visibles",
  "Matrículas online",
  "Acceso a Nexa Club",
  "Conexión directa con Nexa",
];

const standaloneTierLabels: Record<string, string> = {
  basic: "Basica",
  standard: "Profesional",
  complete: "Completa",
};

export function WebService() {
  return (
    <section id="web-service" className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Servicio web</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Tu escuela necesita una web profesional
          </h2>
          <p className="mt-4 text-muted-foreground">
            La mayoría de escuelas no tienen web o la suya está obsoleta. Diseñamos webs optimizadas para captar y matricular alumnos.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Integrated */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border-2 border-primary/30 bg-card p-7 ring-1 ring-primary/10 relative"
          >
            <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
              Recomendada con Nexa
            </span>

            <div className="flex items-center gap-2 mb-2 mt-1">
              <Link2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{integratedWeb.label}</h3>
            </div>
              <p className="text-sm text-muted-foreground mb-4">
              Tu web y tu sistema trabajan juntos. Los alumnos pasan de la web a la matricula sin fricciones.
            </p>

            <ul className="space-y-2 mb-5">
              {integratedFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-border bg-background p-4 mb-4">
              <p className="text-sm font-medium text-foreground mb-1">
                Desde {formatEuro(Math.min(...Object.values(integratedWeb.pricingByPlanEur as Record<string, number>)))} · Pago único
              </p>
              {integratedWeb.bundleEligible && (
                <p className="text-xs text-primary font-semibold">
                  {formatEuro(integratedWeb.bundlePriceEur)} incluida en el Pack Modernización Pro
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Pago fraccionado disponible</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Divide el coste en {integratedWeb.installments.months.join("–")} meses sin intereses.
                Ejemplo: {formatEuro(integratedWeb.installments.exampleMonthlyEur)}/mes × {integratedWeb.installments.exampleMonths} meses.
              </p>
            </div>
          </motion.div>

          {/* Standalone */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-7"
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">{standaloneWeb.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Si solo necesitas una web profesional, no hace falta contratar el software de gestion. Web independiente y lista para captar alumnos.
            </p>

            <div className="space-y-3 mb-5">
              {Object.entries(standaloneWeb.tierPricingEur as Record<string, number>).map(([tier, price]) => (
                <div key={tier} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{standaloneTierLabels[tier] || tier}</span>
                  <span className="text-sm font-bold text-foreground">{formatEuro(price)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-background p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Pago único</span>
              </div>
              <p className="text-xs text-muted-foreground">Un solo pago y la web es tuya. Opcion de pago fraccionado 3 o 6 meses sin intereses.</p>
            </div>

            {standaloneWeb.maintenance && (
              <p className="text-xs text-muted-foreground text-center">
                Mantenimiento opcional: {formatEuro(standaloneWeb.maintenance.monthlyPriceEur)}/mes
              </p>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <Button size="lg" className="h-11" asChild>
            <Link to={PRO_ANNUAL_CTA_HREF}>
              Probar web integrada gratis
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">Activa tu prueba gratuita de 14 días sin compromiso.</p>
        </motion.div>
      </div>
    </section>
  );
}
