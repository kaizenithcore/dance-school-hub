import { motion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const guides = [
  { title: "Cómo crear tu matrícula en 5 minutos", desc: "Configura el formulario, añade campos y comparte el enlace." },
  { title: "Cómo organizar el horario de todo el curso", desc: "Arrastra clases, asigna salas y detecta conflictos al instante." },
  { title: "Cómo automatizar renovaciones de alumnos", desc: "Lanza campañas de renovación masiva y gestiona confirmaciones." },
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

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
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
              <Button variant="ghost" className="mt-4 justify-start px-0 text-primary hover:text-primary">
                Ver guía <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
