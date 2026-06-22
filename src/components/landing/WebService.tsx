import { motion } from "framer-motion";
import { Globe, ArrowRight, Link2, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildRegisterHref, commercialCatalog, formatEuro } from "@/lib/commercialCatalog";
import { Link } from "react-router-dom";

interface WebsiteTierPricingCatalog {
  basic?: number;
  standard?: number;
}

interface WebsiteSimplePricingCatalog {
  landingBasic?: number;
  fullWebsite?: number;
}

interface WebsiteServiceCatalog {
  tierPricingEur?: WebsiteTierPricingCatalog;
  simplePricingEur?: WebsiteSimplePricingCatalog;
}

const webCatalog = commercialCatalog.professionalServices as Record<string, WebsiteServiceCatalog>;
const standaloneWeb = webCatalog?.standaloneWebsite;
const integratedWeb = webCatalog?.integratedWebsite;
const PRO_ANNUAL_CTA_HREF = buildRegisterHref("web_service");

export function WebService() {
  const integratedBasic = integratedWeb?.simplePricingEur?.landingBasic ?? 399;
  const integratedFull = integratedWeb?.simplePricingEur?.fullWebsite ?? 849;
  const standaloneBasic = standaloneWeb?.tierPricingEur?.basic ?? 399;
  const standaloneFull = standaloneWeb?.tierPricingEur?.standard ?? 849;

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
            Web clara, profesional y orientada a conversion
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Elige el nivel de integracion segun tu momento: presencia digital o sistema completo conectado a tu academia.
          </p>

          <div className="mt-10 grid lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
            <div className="lg:col-span-3 rounded-2xl border-2 border-primary/40 bg-card p-6 text-left relative shadow-lg">
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                Mejor opcion con Nexa
              </span>
              <div className="flex items-center gap-2 mb-4 mt-2">
                <Link2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Web integrada (con Nexa)</p>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Tu web deja de ser solo una pagina: se convierte en parte de tu sistema.</p>
              <p className="text-sm text-foreground mb-5">Captas, matriculas y gestionas desde un mismo flujo.</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-background p-4 text-center">
                  <p className="text-xs text-muted-foreground">Landing basica</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatEuro(integratedBasic)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Pago unico</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 text-center">
                  <p className="text-xs text-muted-foreground">Web completa</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatEuro(integratedFull)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Pago unico</p>
                </div>
              </div>

              <div className="mt-5">
                <Button size="lg" className="rounded-xl" asChild>
                  <Link to={PRO_ANNUAL_CTA_HREF}>
                    Quiero mi web conectada
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 text-left">
              <div className="flex items-center gap-2 mb-4">
                <Globe2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Web independiente</p>
              </div>
              <p className="text-sm text-muted-foreground mb-5">Una web profesional para captar alumnos, sin necesidad de cambiar tu sistema actual.</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-background p-4 text-center">
                  <p className="text-xs text-muted-foreground">Landing basica</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatEuro(standaloneBasic)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Pago unico</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 text-center">
                  <p className="text-xs text-muted-foreground">Web completa</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatEuro(standaloneFull)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Pago unico</p>
                </div>
              </div>

              <div className="mt-5">
                <Button size="lg" variant="outline" className="rounded-xl" asChild>
                  <a href="mailto:hola@nexa.es?subject=Consulta%20web%20independiente%20Nexa">
                    Solo necesito una web
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Podras conectarla a Nexa mas adelante sin rehacerla.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-7 text-sm text-muted-foreground">Empieza por presencia. Evoluciona a sistema.</p>
          <p className="mt-1 text-sm text-muted-foreground">Tu web puede crecer contigo sin empezar de cero.</p>
        </motion.div>
      </div>
    </section>
  );
}
