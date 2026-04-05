import { motion } from "framer-motion";

export function ProductShowcase() {
  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Todo lo que necesitas, sin complicaciones
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              <span className="ml-3 text-[11px] text-muted-foreground font-mono">app.nexa/admin</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Alumnos activos", value: "412" },
                  { label: "Matrículas hoy", value: "8" },
                  { label: "Ocupación media", value: "91%" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs font-medium text-foreground mb-3">Horario semanal</p>
                  <div className="grid grid-cols-5 gap-2">
                    {["Lun", "Mar", "Mié", "Jue", "Vie"].map((d, i) => (
                      <div key={d} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground text-center">{d}</p>
                        {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
                          <div key={j} className="h-5 rounded bg-primary/10 border border-primary/20" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs font-medium text-foreground mb-3">Últimas matrículas</p>
                  <div className="space-y-2">
                    {["María García — Ballet", "Carlos López — Jazz", "Ana Ruiz — Hip Hop"].map((e) => (
                      <div key={e} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{e}</span>
                        <span className="text-success text-[10px] font-medium">Confirmada</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
