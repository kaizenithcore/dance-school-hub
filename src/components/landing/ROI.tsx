import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

export function ROI() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Retorno de inversión</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Ahorra más de lo que cuesta
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto"
        >
          {/* Without */}
          <div className="rounded-2xl border border-destructive/20 bg-card p-7">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-destructive" />
              <span className="text-sm font-semibold text-destructive">Sin la plataforma</span>
            </div>
            <p className="text-3xl font-bold text-foreground">+1.000€<span className="text-base font-normal text-muted-foreground">/mes</span></p>
            <p className="mt-2 text-sm text-muted-foreground">
              Coste aproximado de un administrativo dedicado a gestionar matrículas, horarios, comunicaciones y renovaciones manualmente.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <li>• Horas extras en temporada de matrícula</li>
              <li>• Errores humanos en datos y horarios</li>
              <li>• Alumnos perdidos por mala comunicación</li>
            </ul>
          </div>

          {/* With */}
          <div className="rounded-2xl border border-success/30 bg-card p-7 ring-1 ring-success/10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-success" />
              <span className="text-sm font-semibold text-success">Con la plataforma</span>
            </div>
            <p className="text-3xl font-bold text-foreground">249€<span className="text-base font-normal text-muted-foreground">/mes</span></p>
            <p className="mt-2 text-sm text-muted-foreground">
              Automatiza la mayor parte del trabajo administrativo con el plan Pro. Sin errores, sin papel, sin estrés.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <li>• Matrículas 100% online y autoservicio</li>
              <li>• Horarios organizados en minutos</li>
              <li>• Renovaciones con un solo clic</li>
            </ul>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center text-sm text-muted-foreground max-w-md mx-auto"
        >
          Un administrativo puede costar más de 1.000€/mes. Esta plataforma automatiza gran parte de ese trabajo por menos de 250€/mes.
        </motion.p>
      </div>
    </section>
  );
}
