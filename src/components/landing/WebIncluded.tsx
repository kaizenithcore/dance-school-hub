import { motion } from "framer-motion";
import { Globe, Calendar, GraduationCap, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Globe, label: "Landing pública automática", desc: "Tu escuela visible online desde el primer momento" },
  { icon: Calendar, label: "Horarios y clases visibles", desc: "Tus alumnos ven el calendario en tiempo real" },
  { icon: GraduationCap, label: "Matrícula online integrada", desc: "Convierte visitas en alumnos sin intermediarios" },
  { icon: Users, label: "Acceso al portal del alumno", desc: "Cada alumno con su espacio personal" },
];

export function WebIncluded() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Incluido en todos los planes
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Tu escuela ya tiene web desde el primer día
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sin diseñadores, sin esperas. Empiezas a captar alumnos desde el minuto 1.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{f.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          Diseño simple pero funcional. Lista para usar desde el primer día.
        </motion.p>

        <div className="mt-6 text-center">
          <Button variant="outline" size="lg" asChild>
            <a href="#web-service">
              Ver ejemplo de web
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
