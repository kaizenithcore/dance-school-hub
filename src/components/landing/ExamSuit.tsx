import { motion } from "framer-motion";
import { Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commercialCatalog } from "@/lib/commercialCatalog";
import { Link } from "react-router-dom";

const examSuit = (commercialCatalog as any).examSuit;
const CERTIFIER_CTA_HREF = "/auth/register?plan=pro&billing=annual&product=certifier&trial=14d&source=certifier";

export function ExamSuit() {
  if (!examSuit) return null;

  return (
    <section id="examsuit" className="py-24 sm:py-32 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-8 sm:p-10 text-center"
        >
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            ¿Gestionas exámenes o certificaciones?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Sistema completo para asociaciones y convocatorias. Gestión de alumnos, evaluaciones y certificados.
          </p>
          <div className="mt-8">
            <Button size="lg" variant="outline" className="rounded-xl" asChild>
              <Link to={CERTIFIER_CTA_HREF}>
                Solicitar acceso
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
