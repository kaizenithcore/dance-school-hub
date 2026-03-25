import { motion } from "framer-motion";
import { FileWarning, CalendarX, RotateCcw, Users, Clock, Calendar } from "lucide-react";
import { ArrowDown } from "lucide-react";

const problems = [
  { icon: FileWarning, title: "Matrículas caóticas", desc: "Formularios en papel, emails perdidos y datos duplicados." },
  { icon: CalendarX, title: "Horarios imposibles", desc: "Reorganizar horarios consume horas y genera conflictos." },
  { icon: RotateCcw, title: "Renovaciones manuales", desc: "Cada año, semanas recopilando confirmaciones una a una." },
  { icon: Users, title: "Listas de espera desordenadas", desc: "Alumnos que esperan sin orden ni comunicación clara." },
  { icon: Clock, title: "Demasiado tiempo administrativo", desc: "Horas perdidas en tareas que deberían ser automáticas." },
  { icon: Calendar, title: "Eventos desorganizados", desc: "Escaletas imposibles de gestionar y coordinar." },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Problems() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">El problema</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            ¿Tu academia también vive con este caos?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Estos problemas cuestan tiempo, dinero y alumnos cada curso.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {problems.map((p) => (
            <motion.div
              key={p.title}
              variants={item}
              className="group rounded-xl border border-border bg-card p-6 hover:border-destructive/30 hover:shadow-md transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-4">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <div className="inline-flex flex-col items-center gap-2">
            <ArrowDown className="h-5 w-5 text-primary animate-bounce" />
            <p className="text-lg font-semibold text-foreground">
              Todo esto puede <span className="text-primary">automatizarse</span>.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
