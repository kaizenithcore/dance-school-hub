import { motion } from "framer-motion";
import { Globe, Link2, Palette, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const integrated = [
  { icon: Link2, text: "Conectada a matrículas online" },
  { icon: Globe, text: "Conectada a clases y horarios" },
  { icon: Palette, text: "Conectada a eventos de la escuela" },
];

export function WebService() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Servicio web</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Crea una web profesional para tu escuela
          </h2>
          <p className="mt-4 text-muted-foreground">
            Muchas escuelas no tienen web o la suya está obsoleta. Diseñamos webs optimizadas para captar alumnos.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Integrated */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-primary/20 bg-card p-7 ring-1 ring-primary/10"
          >
            <h3 className="text-lg font-semibold text-foreground mb-1">Web integrada con DanceHub</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Tu web y tu sistema trabajan juntos. Los alumnos pasan de la web a la matrícula sin fricciones.
            </p>
            <ul className="space-y-3">
              {integrated.map((item) => (
                <li key={item.text} className="flex items-center gap-3 text-sm text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary shrink-0">
                    <item.icon className="h-4 w-4" />
                  </div>
                  {item.text}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Independent */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-7"
          >
            <h3 className="text-lg font-semibold text-foreground mb-1">Web independiente</h3>
            <p className="text-sm text-muted-foreground mb-5">
              ¿Solo necesitas una web? También podemos ayudarte. Sin necesidad de contratar el software de gestión.
            </p>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Pago único</span>
                </div>
                <p className="text-xs text-muted-foreground">Un solo pago y la web es tuya. Sin costes recurrentes.</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Pago fraccionado</span>
                </div>
                <p className="text-xs text-muted-foreground">Divide el coste en 3–6 meses sin intereses ni permanencias.</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground text-center">Sin costes ocultos ni permanencias</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <Button size="lg" variant="outline" className="h-11" asChild>
            <a href="mailto:hola@dancehub.es?subject=Consulta%20servicio%20web%20DanceHub">
              Solicitar información
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
