import { motion } from "framer-motion";
import { Palette, Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commercialCatalog, formatEuro } from "@/lib/commercialCatalog";

const creative = (commercialCatalog as any).creativeServices;
const services = creative?.services || {};

const identityReview = services.identityReview;
const rebranding = services.rebranding;

export function WeydiCreativeServices() {
  if (!creative) return null;

  return (
    <section id="creative-services" className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Bloque creativo premium</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Dirección creativa por {creative.provider}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {creative.providerDescription} Servicios opcionales para elevar la imagen de tu escuela con criterio profesional.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Identity Review */}
          {identityReview && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-7 relative"
            >
              {identityReview.includedInBundle && (
                <span className="absolute -top-3 left-6 rounded-full bg-success px-3 py-1 text-[10px] font-semibold text-white">
                  Incluido en el Pack Pro
                </span>
              )}
              <div className="flex items-center gap-3 mb-4 mt-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{identityReview.label}</h3>
                  <p className="text-2xl font-bold text-foreground">{formatEuro(identityReview.pricingEur)}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {identityReview.description}
              </p>
            </motion.div>
          )}

          {/* Rebranding */}
          {rebranding && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card p-7"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{rebranding.label}</h3>
                  <p className="text-2xl font-bold text-foreground">{formatEuro(rebranding.pricingEur)}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {rebranding.description}
              </p>
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Estos servicios se pueden añadir a cualquier proyecto de web o modernización.
          </p>
          <Button variant="outline" size="lg" className="h-11" asChild>
            <a href="mailto:hola@nexa.es?subject=Consulta%20servicios%20creativos%20Weydi">
              Consultar servicios creativos
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
