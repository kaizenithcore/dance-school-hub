import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    quote: "Antes tardábamos semanas en gestionar las matrículas del curso. Ahora se hace todo online en días.",
    name: "Laura Martínez",
    role: "Directora, Escuela de Danza Armonía",
    initials: "LM",
  },
  {
    quote: "El editor de horarios nos ha cambiado la vida. Lo que antes eran horas con una pizarra, ahora son 20 minutos.",
    name: "Carlos Fernández",
    role: "Coordinador, Academia MovArt",
    initials: "CF",
  },
  {
    quote: "Los padres ya no llaman para preguntar horarios. Todo está en el portal del alumno. Menos estrés para todos.",
    name: "Ana Rodríguez",
    role: "Administradora, Centro de Danza Élite",
    initials: "AR",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonios</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Lo que dicen las escuelas
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-7 flex flex-col"
            >
              <Quote className="h-5 w-5 text-primary/40 mb-4" />
              <p className="text-sm text-foreground leading-relaxed flex-1">{t.quote}</p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-accent text-primary text-xs font-semibold">{t.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
