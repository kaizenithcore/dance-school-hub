import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const without = [
  "Excel para gestionar alumnos",
  "WhatsApp para comunicarte",
  "Renovaciones manuales cada curso",
  "Imagen poco profesional",
];

const withNexa = [
  "Sistema centralizado y automatizado",
  "Comunicación profesional integrada",
  "Renovaciones con un solo clic",
  "Imagen moderna y profesional",
];

export function DecisionCompare() {
  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            De Excel y WhatsApp a un sistema profesional
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-destructive/20 bg-card p-7"
          >
            <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-5">Sin Nexa</h3>
            <ul className="space-y-3">
              {without.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-success/30 bg-card p-7 ring-1 ring-success/10"
          >
            <h3 className="text-sm font-semibold text-success uppercase tracking-wider mb-5">Con Nexa</h3>
            <ul className="space-y-3">
              {withNexa.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
