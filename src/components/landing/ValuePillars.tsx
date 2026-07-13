import { motion } from "framer-motion";
import { Link, Zap, BarChart2, Star, Users, Activity, BookOpen, FileText, Bell, Calendar, CreditCard, Smartphone } from "lucide-react";
import type { LandingPillar } from "@/lib/vertical/landingContent";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Link, Zap, BarChart2, Star, Users, Activity, BookOpen, FileText, Bell, Calendar, CreditCard, Smartphone,
};

const DEFAULT_PILLARS: LandingPillar[] = [
  { icon: "Link", title: "Todo conectado", description: "Alumnos, clases, pagos y comunicación en un solo lugar. Sin saltar entre apps." },
  { icon: "Zap", title: "Menos trabajo", description: "Automatiza cobros, listas de espera y recordatorios. Recupera horas cada semana." },
  { icon: "BarChart2", title: "Más control", description: "Dashboards claros sobre ocupación, ingresos y asistencia en tiempo real." },
  { icon: "Star", title: "Mejor experiencia", description: "Portal de familias para consultas, pagos y novedades. Menos llamadas, más satisfacción." },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

interface Props {
  pillars?: LandingPillar[];
}

export function ValuePillars({ pillars = DEFAULT_PILLARS }: Props) {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Menos gestión. Más control.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Convierte tu centro en un sistema eficiente.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
        >
          {pillars.map((p) => {
            const Icon = ICON_MAP[p.icon] ?? Zap;
            return (
              <motion.div
                key={p.title}
                variants={item}
                className="rounded-2xl bg-card border border-border p-7 text-center hover:shadow-md transition-shadow"
              >
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
