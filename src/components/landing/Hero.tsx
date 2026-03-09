import { motion } from "framer-motion";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  "Matrículas online en minutos",
  "Horarios visuales fáciles de organizar",
  "Renovaciones automáticas de alumnos",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-background to-background" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/4" />

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Plataforma para academias de 200 a 4.000 alumnos
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-foreground leading-[1.1]">
              Gestiona tu escuela{" "}
              <span className="text-primary">sin caos administrativo</span>
            </h1>

            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-lg">
              Matrículas, horarios, renovaciones y comunicación con alumnos en una sola plataforma diseñada para academias privadas.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="h-12 px-7 text-base font-semibold">
                Probar gratis
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-7 text-base">
                <Play className="mr-1 h-4 w-4" />
                Ver demo
              </Button>
            </div>

            <ul className="mt-8 flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right — Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 text-[11px] text-muted-foreground font-mono">app.dancehub.es/admin</span>
              </div>
              {/* Dashboard content */}
              <div className="p-5 space-y-4">
                {/* Stat row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Alumnos activos", value: "847" },
                    { label: "Matrículas hoy", value: "12" },
                    { label: "Ocupación media", value: "87%" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
                {/* Schedule preview */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-medium text-foreground mb-2">Horario semanal</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {["Lun", "Mar", "Mié", "Jue", "Vie"].map((d, i) => (
                      <div key={d} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground text-center">{d}</p>
                        {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
                          <div
                            key={j}
                            className="h-5 rounded bg-primary/10 border border-primary/20"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Recent enrollments */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-medium text-foreground mb-2">Últimas matrículas</p>
                  <div className="space-y-1.5">
                    {["María García — Ballet Avanzado", "Carlos López — Jazz Moderno", "Ana Ruiz — Hip Hop Kids"].map(
                      (e) => (
                        <div key={e} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{e}</span>
                          <span className="text-success text-[10px] font-medium">Confirmada</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Glow behind */}
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
