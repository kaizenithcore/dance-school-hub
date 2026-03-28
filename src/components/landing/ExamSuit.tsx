import { motion } from "framer-motion";
import { Award, FileCheck, Users, BarChart3, ClipboardList, Globe, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { commercialCatalog, formatEuro } from "@/lib/commercialCatalog";

const examSuit = (commercialCatalog as any).examSuit;
const assocPlan = examSuit?.plans?.associations;
const schoolPlan = examSuit?.plans?.schools;

const highlights = [
  { icon: ClipboardList, text: "Convocatorias" },
  { icon: Globe, text: "Matrículas online" },
  { icon: FileCheck, text: "Evaluaciones" },
  { icon: Award, text: "Certificados" },
  { icon: Users, text: "Multi-escuela" },
  { icon: BarChart3, text: "Estadísticas" },
];

export function ExamSuit() {
  if (!examSuit) return null;

  return (
    <section id="examsuit" className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Certifier
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Gestiona certificaciones con Certifier
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Automatiza inscripciones, resultados y certificados en un único flujo.
          </p>
        </motion.div>

        {/* Visual highlights */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto mb-14"
        >
          {highlights.map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center">
              <Icon className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium text-foreground">{text}</span>
            </div>
          ))}
        </motion.div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mb-14"
        >
          <p className="text-muted-foreground text-center leading-relaxed">
            Nexa incluye <strong className="text-foreground">Certifier</strong>, diseñado para asociaciones,
            federaciones y escuelas que necesitan control total en certificaciones.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Associations */}
          {assocPlan && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-primary bg-card p-7 relative shadow-lg ring-1 ring-primary/20"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                Recomendado
              </span>
              <h3 className="text-lg font-semibold text-foreground mt-2">{assocPlan.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{examSuit.tagline}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {formatEuro(assocPlan.billing.annualEffectiveMonthlyPriceEur)}
                </span>
                <span className="text-sm text-muted-foreground">/mes</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Facturación anual: {formatEuro(assocPlan.billing.annualTotalEur)}/año
              </p>
              <p className="text-xs font-medium text-success">{assocPlan.billing.annualSavingsLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Mantenimiento fuera de temporada: {formatEuro(assocPlan.maintenanceMonthlyEur)}/mes
              </p>

              <ul className="mt-6 space-y-2.5 flex-1">
                {assocPlan.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button className="mt-7 w-full" size="lg" asChild>
                <a href={assocPlan.cta.href}>
                  {assocPlan.cta.label}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          )}

          {/* Schools Lite */}
          {schoolPlan && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card p-7"
            >
              <h3 className="text-lg font-semibold text-foreground">{schoolPlan.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                ¿Solo necesitas gestionar exámenes en tu escuela?
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {formatEuro(schoolPlan.billing.annualEffectiveMonthlyPriceEur)}
                </span>
                <span className="text-sm text-muted-foreground">/mes</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Facturación anual: {formatEuro(schoolPlan.billing.annualTotalEur)}/año
              </p>
              <p className="text-xs font-medium text-success">{schoolPlan.billing.annualSavingsLabel}</p>

              <ul className="mt-6 space-y-2.5 flex-1">
                {schoolPlan.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-xs text-muted-foreground italic">{schoolPlan.note}</p>

              <Button className="mt-5 w-full" variant="outline" size="lg" asChild>
                <a href={schoolPlan.cta.href}>
                  {schoolPlan.cta.label}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Conversion microcopy */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto"
        >
          El mismo sistema que usan asociaciones para certificar, ahora para gestionar tu escuela.
        </motion.p>
      </div>
    </section>
  );
}
