import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Plan {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaExternal?: boolean;
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "Starter",
    price: "179€",
    period: "/mes",
    desc: "Hasta 300 alumnos",
    features: [
      "Solo limite por alumnos activos",
      "Sin limite de profesores, clases ni aulas",
      "Gestión de alumnos",
      "Gestión de clases",
      "Editor de matrícula",
      "Horario manual",
      "Hojas de asistencia",
      "Importador Excel",
    ],
    cta: "Empezar",
    ctaHref: "/auth/register",
  },
  {
    name: "Pro",
    price: "349€",
    period: "/mes",
    desc: "Hasta 1.200 alumnos",
    features: [
      "Todo en Starter",
      "Solo limite por alumnos activos",
      "Listas de espera automáticas",
      "Renovaciones automáticas",
      "Copia de curso anterior",
      "Comunicación masiva",
      "Detección de problemas en horarios",
    ],
    cta: "Probar gratis",
    ctaHref: "/auth/register",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "699€",
    period: "/mes",
    desc: "Hasta 4.000 alumnos",
    features: [
      "Todo en Pro",
      "Solo limite por alumnos activos",
      "Multi-sede",
      "Roles avanzados",
      "Analítica avanzada",
      "Gestión completa de escuela",
      "Soporte prioritario",
    ],
    cta: "Contactar",
    ctaHref: "mailto:hola@dancehub.es?subject=Consulta%20plan%20Enterprise%20DanceHub",
    ctaExternal: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Precios</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Planes simples, sin sorpresas
          </h2>
          <p className="mt-4 text-muted-foreground">
            Una plataforma para eliminar horas administrativas cada semana. El precio escala solo por alumnos activos.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "rounded-2xl border p-7 flex flex-col relative",
                plan.highlighted
                  ? "border-primary bg-card shadow-lg ring-1 ring-primary/20"
                  : "border-border bg-card"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  Más popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>

              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-7 w-full"
                variant={plan.highlighted ? "default" : "outline"}
                size="lg"
                asChild
              >
                {plan.ctaExternal ? (
                  <a href={plan.ctaHref}>{plan.cta}<ArrowRight className="ml-1 h-4 w-4" /></a>
                ) : (
                  <Link to={plan.ctaHref}>{plan.cta}<ArrowRight className="ml-1 h-4 w-4" /></Link>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 max-w-5xl mx-auto">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Add-ons y compras puntuales</h3>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <p>Dominio personalizado: 29 EUR/mes</p>
            <p>Soporte prioritario: 49 EUR/mes</p>
            <p>Lista de espera automatica para Starter: 19 EUR/mes</p>
            <p>Bloques extra de alumnos: Starter +100 (15 EUR), Pro +300 (25 EUR), Enterprise +1000 (50 EUR)</p>
          </div>
        </div>
      </div>
    </section>
  );
}
