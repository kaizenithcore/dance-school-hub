import { motion } from "framer-motion";

interface AboutSectionProps {
  content: {
    eyebrow?: string;
    title: string;
    paragraphs: string[];
    images: { src: string; alt: string }[];
    stats: { value: string; label: string }[];
  };
}

export function AboutSection({ content }: AboutSectionProps) {
  return (
    <section id="quienes-somos" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            {content.eyebrow && (
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                {content.eyebrow}
              </span>
            )}
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-stone-900 md:text-5xl">
              {content.title}
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-stone-600">
              {content.paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 gap-4 md:gap-5">
              {content.images.slice(0, 4).map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`overflow-hidden rounded-2xl shadow-lg shadow-stone-900/5 ${
                    i % 3 === 0 ? "aspect-[4/5]" : "aspect-square"
                  } ${i === 1 ? "mt-10" : ""} ${i === 3 ? "-mt-6" : ""}`}
                >
                  <img src={img.src} alt={img.alt} loading="lazy" className="h-full w-full object-cover" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-6 border-t border-stone-200 pt-12 md:grid-cols-4 md:gap-10">
          {content.stats.map((s) => (
            <div key={s.label}>
              <p className="font-serif text-5xl tracking-tight text-stone-900 md:text-6xl">{s.value}</p>
              <p className="mt-2 text-sm uppercase tracking-wider text-stone-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
