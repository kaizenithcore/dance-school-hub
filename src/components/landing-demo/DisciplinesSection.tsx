import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DisciplinesSectionProps {
  content: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    scheduleUrl: string;
    items: {
      name: string;
      description: string;
      level: string;
      image: { src: string; alt: string };
    }[];
  };
}

export function DisciplinesSection({ content }: DisciplinesSectionProps) {
  return (
    <section id="disciplinas" className="bg-stone-50 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          {content.eyebrow && (
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              {content.eyebrow}
            </span>
          )}
          <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-stone-900 md:text-5xl">
            {content.title}
          </h2>
          {content.subtitle && (
            <p className="mt-5 text-lg text-stone-600">{content.subtitle}</p>
          )}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {content.items.map((item, i) => (
            <motion.a
              key={item.name}
              href={content.scheduleUrl}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-stone-300"
            >
              <div className="aspect-[5/4] overflow-hidden">
                <img
                  src={item.image.src}
                  alt={item.image.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-2xl tracking-tight text-stone-900">{item.name}</h3>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-stone-400 transition-colors group-hover:text-stone-900" />
                </div>
                <p className="text-sm leading-relaxed text-stone-600">{item.description}</p>
                <Badge variant="secondary" className="mt-auto w-fit rounded-full bg-stone-100 font-normal text-stone-700 hover:bg-stone-100">
                  {item.level}
                </Badge>
              </div>
            </motion.a>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-stone-500">
          Pulsa cualquier disciplina para ver su horario actualizado.
        </p>
      </div>
    </section>
  );
}
