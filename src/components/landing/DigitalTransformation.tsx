import { motion } from "framer-motion";
import { Smartphone, Globe, Palette, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const pillars = [
  {
    icon: Smartphone,
    title: "Portal del alumno",
    desc: "Tus alumnos consultan horarios, clases, certificaciones y su perfil de bailarín desde una app moderna.",
  },
  {
    icon: Globe,
    title: "Landing de matrícula",
    desc: "Página pública profesional donde los alumnos se matriculan online sin llamadas ni papel.",
  },
  {
    icon: Palette,
    title: "Web profesional para tu escuela",
    desc: "Servicio opcional: diseñamos una web a medida que refleja la identidad de tu academia.",
  },
];

export function DigitalTransformation() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Modernización digital</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Da el salto digital en días, no meses
          </h2>
          <p className="mt-4 text-muted-foreground">
            La mayoría de escuelas de danza siguen funcionando como hace 15 años. DanceHub te permite modernizar tu escuela sin complicaciones.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-7 flex flex-col"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary mb-5">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <Button size="lg" variant="outline" className="h-11" asChild>
            <Link to="/auth/register">
              Empieza tu transformación digital
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
