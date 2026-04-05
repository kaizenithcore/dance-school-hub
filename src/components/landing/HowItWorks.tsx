import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Crea tu matrícula", desc: "Diseña el formulario de inscripción con los campos que necesites." },
  { num: "02", title: "Comparte el enlace", desc: "Envía un link a alumnos y familias para que se registren online." },
  { num: "03", title: "Los alumnos se inscriben", desc: "Eligen sus clases, completan datos y confirman la matrícula." },
  { num: "04", title: "La plataforma organiza", desc: "Clases, horarios y alumnos se estructuran automáticamente." },
  { num: "05", title: "Renovaciones automáticas", desc: "Cuando acaba el curso, lanza renovaciones con un clic." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Cómo funciona</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            En cinco pasos, tu academia organizada y sin complicaciones.  
          </h2>
        </motion.div>

        <div className="relative max-w-3xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-10">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative flex gap-5 sm:gap-6"
              >
                <div className="relative z-10 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-border bg-card text-primary font-bold text-lg shrink-0">
                  {s.num}
                </div>
                <div className="pt-1 sm:pt-3">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
