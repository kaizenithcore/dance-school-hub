import { motion } from "framer-motion";
import { TrendingDown, Clock, Users } from "lucide-react";

const stats = [
  { icon: TrendingDown, value: "−70%", label: "Menos gestión administrativa" },
  { icon: Clock, value: "+25h", label: "Ahorro semanal por escuela" },
  { icon: Users, value: "+40%", label: "Más inscripciones online" },
];

export function Results() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Resultados que se notan
          </h2>
          <p className="mt-4 text-muted-foreground">
            Automatizar lo repetitivo libera tiempo para lo que importa.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-8 text-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-4">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
