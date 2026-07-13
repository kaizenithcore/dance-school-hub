import { motion } from "framer-motion";
import { Globe, ExternalLink, ArrowRight, Layout, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function WebService() {
  return (
    <section id="web-service" className="py-24 sm:py-32 bg-muted/30">
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
            ¿No tienes web? No hay problema.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Desde una landing básica integrada con Nexa hasta una web completa e independiente. Tú eliges con qué empezar.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto text-left">
            {/* Landing integrada */}
            <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 relative">
              <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                Con Nexa
              </span>
              <div className="flex items-center gap-2 mb-3 mt-1">
                <Layout className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Landing integrada</p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Captas alumnos y los matriculas directamente desde tu página. Todo conectado con Nexa desde el primer día.
              </p>
              <p className="text-xs text-muted-foreground mb-4">Desde <span className="font-semibold text-foreground">490€</span> · Pago único</p>
              <div className="flex flex-col gap-2">
                <Button size="sm" className="w-full" asChild>
                  <Link to="/landing-demo">
                    Ver ejemplo <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <a href="mailto:hola@nexa.es?subject=Quiero%20mi%20landing%20integrada">
                    Contactar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Web independiente */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Web completa independiente</p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Una web profesional y autónoma para tu academia, sin atarla a ningún sistema de gestión. Conecta con Nexa cuando quieras.
              </p>
              <p className="text-xs text-muted-foreground mb-4">Desde <span className="font-semibold text-foreground">890€</span> · Pago único</p>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <a href="https://danzante.es" target="_blank" rel="noreferrer">
                    Ver ejemplo real <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <a href="mailto:hola@nexa.es?subject=Quiero%20una%20web%20independiente">
                    Contactar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Empieza por presencia. Evoluciona a sistema completo cuando estés listo.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
