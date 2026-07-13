import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { useVerticalConfig } from "@/lib/vertical/context";
import type { LandingCompareItem } from "@/lib/vertical/landingContent";

const DEFAULT_ITEMS: LandingCompareItem[] = [
  { without: "Excel para gestionar alumnos", with: "Sistema centralizado y automatizado" },
  { without: "WhatsApp para comunicarte", with: "Comunicación profesional integrada" },
  { without: "Renovaciones manuales cada curso", with: "Renovaciones con un solo clic" },
  { without: "Imagen poco profesional", with: "Imagen moderna y profesional" },
];

interface Props {
  compareItems?: LandingCompareItem[];
}

export function DecisionCompare({ compareItems = DEFAULT_ITEMS }: Props) {
  const { productName } = useVerticalConfig();

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
            <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-5">Sin {productName}</h3>
            <ul className="space-y-3">
              {compareItems.map((item) => (
                <li key={item.without} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  {item.without}
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
            <h3 className="text-sm font-semibold text-success uppercase tracking-wider mb-5">Con {productName}</h3>
            <ul className="space-y-3">
              {compareItems.map((item) => (
                <li key={item.with} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  {item.with}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
