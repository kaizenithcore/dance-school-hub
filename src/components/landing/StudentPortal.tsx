import { motion } from "framer-motion";
import { Calendar, BookOpen, Award, PartyPopper, User, Trophy, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Calendar, title: "Horarios personales", desc: "Cada alumno ve su horario actualizado." },
  { icon: BookOpen, title: "Seguimiento de clases", desc: "Historial de asistencia y clases realizadas." },
  { icon: Award, title: "Certificaciones", desc: "Acceso a certificados de exámenes aprobados." },
  { icon: PartyPopper, title: "Eventos", desc: "Próximos eventos, galas y actividades de la escuela." },
  { icon: User, title: "Perfil de bailarín", desc: "Datos personales, nivel y progresión." },
  { icon: Trophy, title: "Gamificación", desc: "Logros y retos que motivan la asistencia." },
];

const schoolBenefits = [
  "Alumnos más motivados y comprometidos",
  "Menos consultas administrativas por teléfono",
  "Mayor fidelización curso tras curso",
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export function StudentPortal() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left — Features */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Nexa Club</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                Tus alumnos, siempre conectados
              </h2>
              <p className="mt-4 text-muted-foreground max-w-md">
                Accede a Nexa Club para ver progreso, clases y eventos desde cualquier dispositivo.
              </p>
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mt-8 grid grid-cols-2 gap-3"
            >
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={item}
                  className="flex gap-3 rounded-lg border border-border bg-card p-3.5"
                >
                  <f.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right — School Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card p-8"
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">¿Qué gana tu escuela?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Nexa Club mejora la experiencia del alumno y reduce tu carga operativa diaria.
            </p>

            <ul className="space-y-4">
              {schoolBenefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">{b}</span>
                </li>
              ))}
            </ul>

            {/* Mini mockup */}
            <div className="mt-8 rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">María García</p>
                  <p className="text-[10px] text-muted-foreground">Ballet Avanzado · Jazz</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Clases", value: "24" },
                  { label: "Asistencia", value: "92%" },
                  { label: "Certificados", value: "3" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-xs font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
        <div className="mt-12 text-center space-x-4">
                <Button size="lg" asChild>
                  <Link to="/portal">
                    Ver más
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/portal/app">
                    Ver demo
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
        </div>
      </div>
    </section>
  );
}
