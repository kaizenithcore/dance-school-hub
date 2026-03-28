import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackPortalEvent } from "@/lib/portalTelemetry";
import { SharedDemoCta } from "@/components/landing/SharedDemoCta";

export function CTA() {
  const handlePrimaryClick = () => {
    trackPortalEvent({
      eventName: "click_cta_primary",
      category: "funnel",
      metadata: {
        section: "final_cta",
        ctaLabel: "Empezar con el pack",
        destination: "/auth/register",
      },
    });
  };

  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-border bg-card p-10 sm:p-16 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Todo tu centro, en un solo sistema
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
              Ahorra horas cada semana y gestiona con control total desde Nexa.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="h-12 rounded-xl px-8 text-base font-semibold shadow-md hover:shadow-lg" asChild>
                <Link to="/auth/register" onClick={handlePrimaryClick}>
                  Empezar ahora
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <SharedDemoCta section="final_cta" className="h-12 px-8 text-base" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
