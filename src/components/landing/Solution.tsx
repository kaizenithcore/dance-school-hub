import { motion } from "framer-motion";
import { FileEdit, LayoutGrid, RefreshCw, ListChecks, Megaphone, Copy } from "lucide-react";

const pillars = [
  { icon: FileEdit, title: "Editor de matrículas flexible", desc: "Crea formularios personalizados con lógica condicional, archivos y selección de clases integrada." },
  { icon: LayoutGrid, title: "Horario visual con drag & drop", desc: "Organiza clases, aulas y profesores arrastrando bloques sobre un calendario semanal." },
  { icon: RefreshCw, title: "Renovaciones automáticas", desc: "Al acabar el curso, lanza renovaciones masivas y gestiona confirmaciones sin esfuerzo." },
  { icon: ListChecks, title: "Listas de espera automáticas", desc: "Cuando se libera una plaza, el siguiente alumno recibe la oferta automáticamente." },
  { icon: Megaphone, title: "Comunicación masiva", desc: "Envía emails segmentados a alumnos, familias o grupos de clases en segundos." },
  { icon: Copy, title: "Copia de curso en un clic", desc: "Clona la estructura del curso anterior y empieza el nuevo periodo al instante." },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function Solution() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">La solución</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Una plataforma, toda la gestión
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cada pilar del producto está diseñado para eliminar trabajo manual.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {pillars.map((p) => (
            <motion.div
              key={p.title}
              variants={item}
              className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
