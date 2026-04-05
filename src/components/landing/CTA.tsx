import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&trial=14d&source=final_cta";

export function CTA() {
  const handleClick = () => {
    trackPortalEvent({
      eventName: "click_cta_primary",
      category: "funnel",
      metadata: { section: "final_cta", ctaLabel: "Probar Nexa gratis", destination: PRO_ANNUAL_CTA_HREF },
    });
  };

  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-border bg-card p-12 sm:p-20 text-center overflow-hidden max-w-3xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Empieza a gestionar tu academia como un sistema
            </h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-md mx-auto">
              14 días gratis. Sin tarjeta. Sin compromiso.
            </p>
            <div className="mt-10">
              <Button size="lg" className="h-13 rounded-xl px-10 text-base font-semibold shadow-md hover:shadow-lg" asChild>
                <Link to={PRO_ANNUAL_CTA_HREF} onClick={handleClick}>
                  Probar Nexa gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
