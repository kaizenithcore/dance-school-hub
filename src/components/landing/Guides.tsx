import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const guides = [
  {
    title: "Cómo crear tu matrícula en 5 minutos",
    desc: "Configura el formulario, añade campos y comparte el enlace.",
    to: "/guides/matricula-5-minutos",
  },
  {
    title: "Cómo organizar el horario de todo el curso",
    desc: "Arrastra clases, asigna salas y detecta conflictos al instante.",
    to: "/guides/organizar-horario-curso",
  },
  {
    title: "Cómo automatizar renovaciones de alumnos",
    desc: "Lanza campañas de renovación masiva y gestiona confirmaciones.",
    to: "/guides/automatizar-renovaciones",
  },
  {
    title: "Cómo gestionar lista de espera sin llamadas",
    desc: "Mantén orden cuando una clase se llena y cubre plazas libres con rapidez.",
    to: "/guides/lista-espera-sin-llamadas",
  },
  {
    title: "Cómo controlar cobros vencidos",
    desc: "Reduce impagos con una rutina administrativa simple y trazable.",
    to: "/guides/cobros-vencidos-reducir-impagos",
  },
];

export function Guides() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Guías rápidas</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Empieza en minutos, no en días
          </h2>
          <p className="mt-4 text-muted-foreground">
            Guías paso a paso para que tu equipo domine la plataforma desde el primer día.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {guides.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 flex flex-col"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary mb-4">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{g.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{g.desc}</p>
              <Link
                to={g.to}
                className="mt-4 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Abrir guía
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
