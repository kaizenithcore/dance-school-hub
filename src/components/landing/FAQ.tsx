import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "¿Puedo importar mis alumnos desde Excel?", a: "Sí. El importador mapea automáticamente las columnas de tu archivo." },
  { q: "¿Necesito conocimientos técnicos?", a: "No. Cualquier persona de tu equipo puede usarlo desde el primer día." },
  { q: "¿Hay periodo de prueba?", a: "Sí. 14 días gratis, sin tarjeta de crédito." },
  { q: "¿Puedo gestionar varias sedes?", a: "Sí, el plan Enterprise incluye soporte multi-sede completo." },
  { q: "¿Incluye portal para alumnos?", a: "Sí. Nexa Club permite a los alumnos consultar horarios, clases y certificaciones." },
];

export function FAQ() {
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
