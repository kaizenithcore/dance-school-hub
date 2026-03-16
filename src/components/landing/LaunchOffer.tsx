import { motion } from "framer-motion";
import { Zap, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function LaunchOffer() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-primary/20 bg-card p-10 sm:p-14 text-center overflow-hidden max-w-4xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/30" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-semibold text-primary mb-6">
              <Zap className="h-3.5 w-3.5" />
              Oferta limitada
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              50% de descuento durante 3 meses
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
              Las primeras escuelas que se unan disfrutan de un 50% de descuento en cualquier plan durante los 3 primeros meses.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-warning" />
              Plazas limitadas — oferta de lanzamiento
            </div>

            <div className="mt-8">
              <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
                <Link to="/auth/register">
                  Aprovechar oferta
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
