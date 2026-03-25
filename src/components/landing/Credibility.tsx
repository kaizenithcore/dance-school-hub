import { motion } from "framer-motion";
import { Quote, BadgeCheck, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { landingTestimonials } from "@/lib/data/landingTestimonials";
import { console } from "inspector/promises";

const proofBadges = [
  "Caso documentado en produccion",
  "Resultados medibles",
  "Casos publicados con KPI validable",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Credibility() {
  const published = landingTestimonials.filter((item) => item.status === "published");
  const featured = published[0];
  const secondary = published.slice(1);

  return (
    <section id="credibility" className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Ya confían en nosotros</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Resultados reales en escuelas reales</h2>
          <p className="mt-4 text-muted-foreground">
            Casos publicados con impacto operativo medible para validar resultados antes de contratar.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-2 mb-10"
        >
          {proofBadges.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <BadgeCheck className="h-3.5 w-3.5 text-success" />
              {badge}
            </span>
          ))}
        </motion.div>

        {featured && (
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card p-7 sm:p-8 mb-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary font-bold">
                  {featured.logoPlaceholderText}
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{featured.schoolName}</p>
                  <p className="text-sm text-muted-foreground">{featured.location}</p>
                </div>
              </div>

              <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 lg:min-w-[280px]">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{featured.metricLabel}</p>
                <p className="mt-1 text-xl font-bold text-success">{featured.metricValue}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-background p-5">
              <Quote className="h-5 w-5 text-primary mb-3" />
              <p className="text-foreground leading-relaxed">{featured.quote}</p>

              <div className="mt-5 flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  {featured.avatarUrl ? <AvatarImage src={featured.avatarUrl} alt={featured.personName} /> : null}
                  <AvatarFallback>{getInitials(featured.personName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{featured.personName}</p>
                  <p className="text-xs text-muted-foreground">{featured.personRole}</p>
                </div>
              </div>
            </div>
          </motion.article>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {secondary.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground font-semibold">
                  {item.logoPlaceholderText}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.schoolName}</p>
                  <p className="text-xs text-muted-foreground">{item.location}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{item.quote}</p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                {item.metricLabel}: {item.metricValue}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
