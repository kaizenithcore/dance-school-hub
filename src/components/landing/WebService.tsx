import { motion } from "framer-motion";
import { Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commercialCatalog, formatEuro } from "@/lib/commercialCatalog";
import { Link } from "react-router-dom";

const webCatalog = commercialCatalog.professionalServices as Record<string, any>;
const standaloneWeb = webCatalog?.standaloneWebsite;
const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&trial=14d&source=web_service";

export function WebService() {
  return (
    <section id="web-service" className="py-24 sm:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Tu web conectada a tu sistema
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Convierte visitas en matrículas automáticamente.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm font-semibold text-foreground">Landing</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                {standaloneWeb?.tierPricingEur?.basic ? formatEuro(standaloneWeb.tierPricingEur.basic) : "399€"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pago único</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm font-semibold text-foreground">Web completa</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                {standaloneWeb?.tierPricingEur?.standard ? formatEuro(standaloneWeb.tierPricingEur.standard) : "849€"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pago único</p>
            </div>
          </div>

          <div className="mt-8">
            <Button size="lg" variant="outline" className="rounded-xl" asChild>
              <Link to={PRO_ANNUAL_CTA_HREF}>
                Más información
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
