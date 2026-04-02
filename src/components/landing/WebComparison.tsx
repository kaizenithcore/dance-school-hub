import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commercialCatalog } from "@/lib/commercialCatalog";
import { Link } from "react-router-dom";

const publicWeb = commercialCatalog.publicWeb;
const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&focus=integrated-web&trial=14d&source=web_comparison";
const integratedWebsite = (commercialCatalog.professionalServices as any)?.integratedWebsite as {
  label?: string;
  includes?: string[];
  differentiator?: string;
} | undefined;

const basicFeatures = publicWeb?.includes?.slice(0, 4) ?? [
  "Diseño estándar",
  "Información esencial de tu escuela",
  "Matrícula online funcional",
  "Horarios visibles",
];

const optimizedFeatures = integratedWebsite?.includes?.slice(0, 5) ?? [
  "Diseño personalizado a tu marca",
  "Copy orientado a conversión",
  "Estructura optimizada para captar",
  "Más matrículas con el mismo tráfico",
  "SEO y rendimiento mejorado",
];

export function WebComparison() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Evoluciona cuando quieras
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            De web básica a máquina de captación
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cuando quieras crecer, optimizas. Sin cambiar de plataforma.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Basic */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card p-7"
          >
            <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              Incluida
            </span>
            <h3 className="text-lg font-semibold text-foreground mb-1">{publicWeb?.label || "Web básica"}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Funcional desde el primer día. Todo lo que necesitas para empezar a captar.
            </p>
            <ul className="space-y-2.5">
              {basicFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Optimized */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border-2 border-primary/30 bg-card p-7 ring-1 ring-primary/10 relative"
          >
            <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
              <Sparkles className="h-3 w-3" />
              Recomendada
            </span>
            <h3 className="text-lg font-semibold text-foreground mb-1 mt-1">{integratedWebsite?.label || "Web optimizada"}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {integratedWebsite?.differentiator || "Diseñada para convertir visitas en alumnos. Más matrículas con el mismo tráfico."}
            </p>
            <ul className="space-y-2.5">
              {optimizedFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button className="w-full" asChild>
                <Link to={PRO_ANNUAL_CTA_HREF}>
                  Mejorar mi web
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
