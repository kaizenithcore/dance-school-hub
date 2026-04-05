import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackPortalEvent } from "@/lib/portalTelemetry";
import { activateDemoAdminSession, DEMO_ADMIN_SLUG } from "@/lib/demoAdmin";

const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&trial=14d&source=hero";
const HERO_DEMO_ADMIN_HREF = `/admin?demo=${DEMO_ADMIN_SLUG}`;

export function Hero() {
  const handlePrimaryClick = () => {
    trackPortalEvent({
      eventName: "click_cta_primary",
      category: "funnel",
      metadata: { section: "hero", ctaLabel: "Probar gratis", destination: PRO_ANNUAL_CTA_HREF },
    });
  };

  const handleDemoClick = () => {
    activateDemoAdminSession(DEMO_ADMIN_SLUG);
    trackPortalEvent({
      eventName: "click_cta_secondary",
      category: "funnel",
      metadata: { section: "hero", ctaLabel: "Ver cómo funciona", destination: HERO_DEMO_ADMIN_HREF },
    });
  };

  return (
    <section className="relative overflow-hidden pt-24 pb-28 sm:pt-32 sm:pb-36">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-background to-background" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/4" />

      <div className="container relative max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            El sistema que tu academia{" "}
            <span className="text-primary">se merece</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Gestiona alumnos, clases, pagos y comunicación en un solo lugar.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button size="lg" className="h-13 rounded-xl px-8 text-base font-semibold shadow-md hover:shadow-lg" asChild>
              <Link to={PRO_ANNUAL_CTA_HREF} onClick={handlePrimaryClick}>
                Probar gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-13 rounded-xl px-8 text-base" asChild>
              <Link to={HERO_DEMO_ADMIN_HREF} onClick={handleDemoClick}>
                Ver cómo funciona
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            14 días gratis · Sin tarjeta · Sin compromiso
          </p>
        </motion.div>
      </div>
    </section>
  );
}
