import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "¿Puedo importar mis alumnos desde Excel?", a: "Sí. El importador inteligente mapea automáticamente las columnas de tu archivo y crea los registros de alumnos en segundos." },
  { q: "¿Puedo personalizar el formulario de matrícula?", a: "Totalmente. El editor visual te permite añadir campos de texto, selectores, archivos, fechas y lógica condicional sin escribir código." },
  { q: "¿Puedo gestionar varias sedes?", a: "Sí, el plan Enterprise incluye soporte multi-sede con gestión independiente de aulas, profesores y horarios por ubicación." },
  { q: "¿Necesito conocimientos técnicos?", a: "No. La plataforma está diseñada para que cualquier persona de tu equipo pueda usarla desde el primer día, sin formación técnica." },
  { q: "¿Hay periodo de prueba?", a: "Sí. Puedes probar el plan Pro durante 14 días sin compromiso y sin tarjeta de crédito." },
];

export function FAQ() {
  return (
    <section className="py-20 sm:py-28">
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
