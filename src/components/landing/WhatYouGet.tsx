import { motion } from "framer-motion";
import { Users, BookOpen, LayoutGrid, FileEdit, Smartphone, Megaphone, Award, Globe } from "lucide-react";

const items = [
  { icon: Users, label: "Software de gestión de alumnos" },
  { icon: BookOpen, label: "Gestión de clases y profesores" },
  { icon: LayoutGrid, label: "Editor visual de horarios" },
  { icon: FileEdit, label: "Sistema de matrículas online" },
  { icon: Smartphone, label: "Nexa Club para alumnos" },
  { icon: Megaphone, label: "Comunicación automatizada" },
  { icon: Award, label: "Certifier: certificaciones y resultados" },
  { icon: Globe, label: "Posibilidad de web profesional" },
];

export function WhatYouGet() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Todo incluido</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Qué incluye realmente Nexa
          </h2>
          <p className="mt-4 text-muted-foreground">
            Menos gestión, más enseñanza. Todo listo para operar con control total.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5 text-center hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary mx-auto mb-3">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-foreground leading-snug">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
