import { motion } from "framer-motion";
import { TrendingDown, Clock, Users, Smile } from "lucide-react";

const stats = [
  { icon: TrendingDown, value: "70%", label: "Menos tiempo en tareas administrativas" },
  { icon: Clock, value: "15h", label: "Ahorro medio semanal por escuela" },
  { icon: Users, value: "100%", label: "Matrículas online sin papel" },
  { icon: Smile, value: "+40%", label: "Mejora en satisfacción de alumnos" },
];

export function Results() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Resultados</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Escuelas que usan DanceHub reducen hasta un 70% el tiempo administrativo
          </h2>
          <p className="mt-4 text-muted-foreground">
            Automatizar las tareas repetitivas libera horas que puedes dedicar a hacer crecer tu escuela.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary mx-auto mb-4">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
