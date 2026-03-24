import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackPortalEvent } from "@/lib/portalTelemetry";

export function CTA() {
  const handlePrimaryClick = () => {
    trackPortalEvent({
      eventName: "click_cta_primary",
      category: "funnel",
      metadata: {
        section: "final_cta",
        ctaLabel: "Probar gratis",
        destination: "/auth/register",
      },
    });
  };

  const handleDemoClick = () => {
    trackPortalEvent({
      eventName: "click_cta_demo",
      category: "funnel",
      metadata: {
        section: "final_cta",
        ctaLabel: "Ver demo en vivo",
        destination: "/s/escuela-demo-dancehub",
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
              Empieza a modernizar tu escuela hoy
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
              Crea tu cuenta y prueba la plataforma gratis durante 14 días. Sin tarjeta de crédito.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
                <Link to="/auth/register" onClick={handlePrimaryClick}>
                  Probar gratis
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <Link to="/s/escuela-demo-dancehub" onClick={handleDemoClick}>
                  <Play className="mr-1 h-4 w-4" />
                  Ver demo en vivo
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
