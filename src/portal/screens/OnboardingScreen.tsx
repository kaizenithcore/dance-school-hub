import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Trophy, Award, Star } from "lucide-react";

const slides = [
  { icon: <BookOpen className="h-10 w-10 text-primary" />, title: "Sigue tus clases", desc: "Consulta tu horario y lleva un registro de todas tus clases." },
  { icon: <Trophy className="h-10 w-10 text-primary" />, title: "Logros y racha", desc: "Desbloquea insignias y mantén tu racha de asistencia." },
  { icon: <Award className="h-10 w-10 text-primary" />, title: "Certificaciones", desc: "Guarda tus certificados y muestra tu evolución." },
  { icon: <Star className="h-10 w-10 text-primary" />, title: "Tu perfil de bailarín", desc: "Crea tu portafolio y comparte tu historia." },
];

export default function OnboardingScreen() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-16">
      {/* Brand */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Dance<span className="text-primary">Hub</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Tu historia como bailarín empieza aquí.</p>
      </motion.div>

      {/* Feature slides */}
      <div className="flex flex-1 flex-col gap-4">
        {slides.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 * i }}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent">
              {s.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{s.title}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-col gap-3">
        <Link
          to="/portal/app"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90"
        >
          Crear perfil gratis <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/portal/app"
          className="flex items-center justify-center rounded-xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
