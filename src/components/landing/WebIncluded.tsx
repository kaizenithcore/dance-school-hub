import { motion } from "framer-motion";
import { Globe, Calendar, GraduationCap, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commercialCatalog } from "@/lib/commercialCatalog";
import { Link } from "react-router-dom";

const publicWeb = commercialCatalog.publicWeb;
const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&focus=integrated-web&trial=14d&source=web_included";

const fallbackFeatures = [
  "Landing pública /s/:slug",
  "Listado de clases y horarios",
  "Formulario de matrícula online",
  "Acceso al portal del alumno",
];

const featureIcons = [Globe, Calendar, GraduationCap, Users];

const featureDescriptions: Record<string, string> = {
  "Landing pública /s/:slug": "Tu escuela visible online desde el primer momento",
  "Listado de clases y horarios": "Tus alumnos ven el calendario en tiempo real",
  "Formulario de matrícula online": "Convierte visitas en alumnos sin intermediarios",
  "Acceso al portal del alumno": "Cada alumno con su espacio personal",
};

const features = (publicWeb?.includes?.slice(0, 4) ?? fallbackFeatures).map((label, index) => ({
  icon: featureIcons[index] ?? Globe,
  label,
  desc: featureDescriptions[label] ?? "Incluido de serie en tu web básica con Nexa",
}));

export function WebIncluded() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Incluido en todos los planes
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            {publicWeb?.label || "Tu escuela ya tiene web desde el primer día"}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {publicWeb?.description || "Sin diseñadores, sin esperas. Empiezas a captar alumnos desde el minuto 1."}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{f.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          Diseño funcional. Lista para usar desde el primer día.
        </motion.p>

        <div className="mt-6 text-center">
          <Button variant="outline" size="lg" asChild>
            <Link to={PRO_ANNUAL_CTA_HREF}>
              Probar con web integrada gratis
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
