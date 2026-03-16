import { motion } from "framer-motion";
import { LayoutGrid, ListChecks, RefreshCw, FileSpreadsheet, AlertTriangle, ClipboardList } from "lucide-react";

const features = [
  { icon: LayoutGrid, title: "Editor visual de horarios", desc: "Drag & drop para organizar clases, aulas y profesores sobre un calendario semanal." },
  { icon: ListChecks, title: "Lista de espera automática", desc: "Cuando se libera una plaza, el siguiente alumno recibe la oferta automáticamente." },
  { icon: RefreshCw, title: "Renovaciones automáticas", desc: "Al acabar el curso, lanza renovaciones masivas y gestiona confirmaciones sin esfuerzo." },
  { icon: FileSpreadsheet, title: "Importador inteligente", desc: "Sube tu Excel de alumnos actual y empieza sin partir de cero." },
  { icon: AlertTriangle, title: "Detección de problemas", desc: "Identifica conflictos de horarios, clases con baja ocupación y solapamientos." },
  { icon: ClipboardList, title: "Hojas de asistencia", desc: "Generación automática de listados de asistencia para cada profesor." },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export function Features() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Funciones avanzadas</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Herramientas que ahorran horas cada semana
          </h2>
          <p className="mt-4 text-muted-foreground">
            Automatizaciones diseñadas para que tu equipo se centre en lo importante: enseñar.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="flex gap-4 rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary shrink-0">
                <f.icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
