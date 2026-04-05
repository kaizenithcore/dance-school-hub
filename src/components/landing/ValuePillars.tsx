import { motion } from "framer-motion";
import { Layers, Zap, BarChart3, Smartphone } from "lucide-react";

const pillars = [
  {
    icon: Layers,
    title: "Todo conectado",
    desc: "Alumnos, clases, pagos y comunicación en un solo sistema.",
  },
  {
    icon: Zap,
    title: "Menos trabajo manual",
    desc: "Automatiza tareas repetitivas y ahorra horas cada semana.",
  },
  {
    icon: BarChart3,
    title: "Más control",
    desc: "Visualiza tu academia en tiempo real con datos claros.",
  },
  {
    icon: Smartphone,
    title: "Mejor experiencia",
    desc: "Portal del alumno incluido. Tus alumnos siempre conectados.",
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function ValuePillars() {
  return (
    <section className="py-24 sm:py-32">
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
            Convierte tu academia en un sistema eficiente.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
        >
          {pillars.map((p) => (
            <motion.div
              key={p.title}
              variants={item}
              className="rounded-2xl bg-card border border-border p-7 text-center hover:shadow-md transition-shadow"
            >
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <p.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
