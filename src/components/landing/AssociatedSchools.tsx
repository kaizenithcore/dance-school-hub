import { motion } from "framer-motion";
import { Check, ArrowRight, Percent, Zap, Upload, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commercialCatalog } from "@/lib/commercialCatalog";
import { Link } from "react-router-dom";

const benefits = (commercialCatalog as any).examSuit?.associatedSchoolsBenefits;
const ASSOCIATED_PRO_CTA_HREF = "/auth/register?plan=pro&billing=annual&product=certifier&discount=associated&trial=14d&source=associated_schools";

const icons = [Percent, Zap, Upload, History];

export function AssociatedSchools() {
  if (!benefits) return null;

  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-primary/20 bg-card p-10 sm:p-14 overflow-hidden max-w-4xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/30" />
          <div className="relative">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 text-center">
              Ventaja exclusiva
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center">
              {benefits.title}
            </h2>
            <p className="mt-4 text-muted-foreground text-center max-w-xl mx-auto">
              {benefits.subtitle}
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {benefits.benefits.map((b: string, i: number) => {
                const Icon = icons[i] || Check;
                return (
                  <div key={b} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{b}</span>
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-center text-base font-semibold text-foreground">
              {benefits.closingLine}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link to={ASSOCIATED_PRO_CTA_HREF}>
                  Activar Plan Pro con descuento
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to={ASSOCIATED_PRO_CTA_HREF}>Crear cuenta gratis</Link>
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Prueba gratis 14 días para empezar sin fricción.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
