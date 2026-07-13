import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { freeTrialDays } from "@/lib/commercialCatalog";
import type { LandingFaq } from "@/lib/vertical/landingContent";

const DEFAULT_FAQS: LandingFaq[] = [
  { q: "¿Puedo importar mis alumnos desde Excel?", a: "Sí. El importador mapea automáticamente las columnas de tu archivo y valida los datos antes de importar." },
  { q: "¿Necesito conocimientos técnicos?", a: "No. Cualquier persona de tu equipo puede usarlo desde el primer día. Está diseñado para directores de escuela, no para informáticos." },
  { q: "¿Hay periodo de prueba?", a: `Sí. ${freeTrialDays} días gratis, sin tarjeta de crédito y sin compromiso.` },
  { q: "¿Qué pasa con mis datos si me voy?", a: "Puedes exportar todos tus datos en cualquier momento. No hay penalización por cancelar." },
  { q: "¿Incluye portal para alumnos?", a: "Sí. El portal del alumno permite consultar horarios, pagos y avisos de la escuela sin necesidad de llamar o mandar mensajes." },
  { q: "¿Funciona para escuelas pequeñas?", a: "Especialmente. Está pensado para academias de 50 a 500 alumnos que trabajan con Excel, papel o WhatsApp y quieren pasarse a un sistema sin complicarse." },
];

interface Props {
  faqs?: LandingFaq[];
}

export function FAQ({ faqs = DEFAULT_FAQS }: Props) {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto mb-12"
        >
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
          <Accordion type="single" collapsible className="w-full">
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
      </div>
    </section>
  );
}
