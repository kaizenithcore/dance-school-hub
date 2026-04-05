import { motion } from "framer-motion";
import { Quote, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { landingTestimonials } from "@/lib/data/landingTestimonials";

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function Credibility() {
  const published = landingTestimonials.filter((item) => item.status === "published");
  if (published.length === 0) return null;

  const featured = published[0];

  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Resultados reales
          </h2>
        </motion.div>

        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-8"
          >
            <Quote className="h-5 w-5 text-primary mb-4" />
            <p className="text-foreground leading-relaxed">{featured.quote}</p>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  {featured.avatarUrl ? <AvatarImage src={featured.avatarUrl} alt={featured.personName} /> : null}
                  <AvatarFallback>{getInitials(featured.personName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{featured.personName}</p>
                  <p className="text-xs text-muted-foreground">{featured.schoolName}</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                {featured.metricValue}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
