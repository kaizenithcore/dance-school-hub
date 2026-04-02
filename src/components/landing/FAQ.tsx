import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const faqs = [
  { q: "¿Puedo importar mis alumnos desde Excel?", a: "Sí. El importador inteligente mapea automáticamente las columnas de tu archivo y crea los registros de alumnos en segundos." },
  { q: "¿Puedo personalizar el formulario de matrícula?", a: "Totalmente. El editor visual te permite añadir campos de texto, selectores, archivos, fechas y lógica condicional sin escribir código." },
  { q: "¿Puedo gestionar varias sedes?", a: "Sí, el plan Enterprise incluye soporte multi-sede con gestión independiente de aulas, profesores y horarios por ubicación." },
  { q: "¿Necesito conocimientos técnicos?", a: "No. La plataforma está diseñada para que cualquier persona de tu equipo pueda usarla desde el primer día, sin formación técnica." },
  { q: "¿Hay periodo de prueba?", a: "Sí. Puedes probar el plan Pro durante 14 días sin compromiso y sin tarjeta de crédito." },
  { q: "¿Incluye Nexa Club para los alumnos?", a: "Sí. Los alumnos pueden consultar horarios, clases, certificaciones y perfil desde Nexa Club, accesible desde el móvil." },
  { q: "¿Cómo funciona Certifier?", a: "Con Certifier puedes crear evaluaciones, registrar candidatos, calificar y generar certificados PDF automáticamente." },
];

const guidesHighlights = [
  "Matrícula en 5 minutos",
  "Cómo organizar el horario del curso",
  "Automatizar renovaciones sin llamadas",
  "Reducir impagos y cobros vencidos",
];

export function FAQ() {
  const handleValueChange = (value: string) => {
    if (!value) {
      return;
    }

    const index = Number(value.replace("faq-", ""));
    const question = Number.isNaN(index) ? undefined : faqs[index]?.q;

    trackPortalEvent({
      eventName: "click_faq_expand",
      category: "funnel",
      metadata: {
        section: "faq",
        itemId: value,
        question,
      },
    });
  };

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Preguntas frecuentes
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full" onValueChange={handleValueChange}>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mt-8 rounded-2xl border border-primary/20 bg-card p-6"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">Guías prácticas</p>
          <h3 className="mt-2 text-xl font-bold text-foreground">Aprende con casos reales paso a paso</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Si quieres implementar Nexa más rápido, consulta nuestras guías de operación y conversión para escuelas.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-foreground">
            {guidesHighlights.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <Button asChild>
              <Link
                to="/guides"
                onClick={() =>
                  trackPortalEvent({
                    eventName: "click_cta_secondary",
                    category: "funnel",
                    metadata: {
                      section: "faq",
                      ctaLabel: "Ver todas las guías",
                      destination: "/guides",
                    },
                  })
                }
              >
                Ver todas las guías
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
