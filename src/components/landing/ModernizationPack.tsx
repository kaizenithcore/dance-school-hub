import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { commercialCatalog, formatEuro } from "@/lib/commercialCatalog";

const packCatalog = commercialCatalog.professionalServices as Record<string, any>;
const modernizationPack = packCatalog.modernizationPack;
const bundleCatalog = (commercialCatalog as any).bundles?.modernizationProBundle;

const items = [
  "Gestión completa de alumnos, clases y profesores",
  "Matrículas online automatizadas",
  "Portal del alumno (app móvil)",
  "Editor visual de horarios",
  "Sistema de comunicación integrado",
  "Imagen digital profesional",
  "Preparado para crecer",
];

export function ModernizationPack() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-primary/20 bg-card overflow-hidden max-w-5xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20" />
          <div className="relative grid md:grid-cols-2 gap-8 p-8 sm:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-semibold text-primary mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                {modernizationPack.label}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                Moderniza tu escuela de danza en un solo paso
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {modernizationPack.shortDescription} DanceHub no es solo software. Es un sistema completo que incluye gestión, app para alumnos, matrícula online y presencia digital profesional.
              </p>
              <p className="mt-4 text-sm text-muted-foreground italic">
                "La mayoría de escuelas siguen gestionando su negocio como hace años. DanceHub te permite dar el salto digital sin complicaciones."
              </p>

              <div className="mt-6 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Desde {formatEuro(modernizationPack.pricingByPlanEur.starter)} · 
                  <span className="text-primary font-semibold"> Incluido en el Plan Pro</span>
                </p>
                {bundleCatalog && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-accent/50 px-3 py-2 text-xs text-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>
                      <strong>{bundleCatalog.label}:</strong> {bundleCatalog.description} — {formatEuro(bundleCatalog.pricing.oneTimeEur)} pago único
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
