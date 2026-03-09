import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
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
              Empieza a organizar tu escuela hoy
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
              Crea tu cuenta y prueba la plataforma gratis durante 14 días.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="h-12 px-8 text-base font-semibold">
                Probar gratis
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                <Play className="mr-1 h-4 w-4" />
                Solicitar demo
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
