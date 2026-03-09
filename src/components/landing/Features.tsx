import { motion } from "framer-motion";
import { ClipboardList, FileSpreadsheet, BarChart3, AlertTriangle, MonitorSmartphone } from "lucide-react";

const features = [
  { icon: ClipboardList, title: "Hojas de asistencia automáticas", desc: "Cada profesor recibe su listado generado al instante." },
  { icon: FileSpreadsheet, title: "Importador desde Excel", desc: "Sube tus datos actuales y empieza sin partir de cero." },
  { icon: BarChart3, title: "Detección de baja ocupación", desc: "Identifica clases con pocas inscripciones antes de que sea tarde." },
  { icon: AlertTriangle, title: "Incidencias rápidas", desc: "Registra ausencias, cambios y notas sobre alumnos al instante." },
  { icon: MonitorSmartphone, title: "Modo recepción", desc: "Interfaz simplificada para personal administrativo en mostrador." },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function Features() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Ahorra tiempo</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Funciones que eliminan trabajo manual
          </h2>
          <p className="mt-4 text-muted-foreground">
            Pequeñas herramientas que suman horas de ahorro cada semana.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto"
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
