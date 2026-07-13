import { motion } from "framer-motion";
import { TrendingDown, Clock, Users, Quote, ArrowRight } from "lucide-react";
import { buildRegisterHref } from "@/lib/commercialCatalog";
import type { LandingStat, LandingTestimonial } from "@/lib/vertical/landingContent";

const STAT_ICONS = [TrendingDown, Clock, Users];

const DEFAULT_STATS: LandingStat[] = [
  { value: "−70%", label: "Menos gestión administrativa" },
  { value: "+25h", label: "Ahorro semanal por escuela" },
  { value: "+40%", label: "Más inscripciones online" },
];

const DEFAULT_TESTIMONIAL: LandingTestimonial = {
  quote: "Antes invertíamos demasiadas horas en matrículas y reorganización de grupos. Ahora el equipo puede centrarse en alumnos y calidad de clases.",
  author: "Etna G.",
  role: "Directora · Escuela Danzante · Griñón, Madrid",
};

const TESTIMONIAL_CTA_HREF = buildRegisterHref("results_testimonial");

interface Props {
  stats?: LandingStat[];
  testimonial?: LandingTestimonial;
}

export function Results({ stats = DEFAULT_STATS, testimonial = DEFAULT_TESTIMONIAL }: Props) {
  return (
    <section className="py-24 sm:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Resultados que se notan
          </h2>
          <p className="mt-4 text-muted-foreground">
            Automatizar lo repetitivo libera tiempo para lo que importa.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {stats.map((s, i) => {
            const Icon = STAT_ICONS[i % STAT_ICONS.length];
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-8 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-bold text-foreground">{s.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-14 max-w-3xl mx-auto grid sm:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card p-7 flex flex-col"
          >
            <Quote className="h-6 w-6 text-primary/40 mb-4" />
            <p className="text-sm text-foreground leading-relaxed flex-1">
              "{testimonial.quote}"
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {testimonial.author[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
                <p className="text-xs text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-7 flex flex-col items-center justify-center text-center"
          >
            <Quote className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">¿También te ha ayudado?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cuéntanos tu historia. Nos encanta saber cómo está cambiando la forma de gestionar centros.
            </p>
            <a
              href={TESTIMONIAL_CTA_HREF}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Escribirnos <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
