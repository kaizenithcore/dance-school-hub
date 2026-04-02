import { motion } from "framer-motion";
import { Users, BookOpen, LayoutGrid, FileEdit, Award, Smartphone, Megaphone, Calendar, BarChart } from "lucide-react";

const modules = [
  { icon: Users, title: "Gestión de alumnos", desc: "Fichas completas, historial, documentos y seguimiento de cada alumno desde un solo lugar." },
  { icon: BookOpen, title: "Gestión de clases", desc: "Crea clases, asigna profesores, controla aforo y gestiona grupos de forma visual." },
  { icon: LayoutGrid, title: "Editor visual de horarios", desc: "Arrastra bloques sobre un calendario semanal para organizar clases, aulas y profesores." },
  { icon: FileEdit, title: "Matrículas online", desc: "Formularios personalizables que los alumnos completan online. Sin papel, sin errores." },
  { icon: Award, title: "Gestión de exámenes", desc: "Registra candidatos, califica con categorías ponderadas y genera certificados automáticamente." },
  { icon: Smartphone, title: "Portal del alumno", desc: "Los alumnos consultan sus horarios, clases, certificaciones y perfil desde su móvil." },
  { icon: Megaphone, title: "Comunicación con alumnos", desc: "Envía emails segmentados a alumnos, familias o grupos de clases en segundos." },
  { icon: Calendar, title: "Gestión de eventos", desc: "Organiza y coordina eventos y escaletas de manera eficiente, evitando conflictos y errores." },
  { icon: BarChart, title: "Análisis y reportes", desc: "Genera informes detallados sobre el rendimiento de tu escuela y la participación de los alumnos." },
  
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

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
            Una plataforma completa para tu escuela
          </h2>
          <p className="mt-4 text-muted-foreground">
            No es solo gestión. Es un sistema de gestión + captación de alumnos para modernizar tu escuela.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto"
        >
          {modules.map((m) => (
            <motion.div
              key={m.title}
              variants={item}
              className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{m.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
