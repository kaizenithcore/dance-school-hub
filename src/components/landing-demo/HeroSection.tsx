import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  content: {
    eyebrow?: string;
    title: string;
    subtitle: string;
    image: { src: string; alt: string };
    trustBadge?: string;
  };
  meta: {
    primaryCtaLabel: string;
    primaryCtaUrl: string;
    secondaryCtaLabel: string;
    secondaryCtaUrl: string;
  };
}

// Hero of the school-facing landing.
// NOTE: In a real tenant, image + copy would come from the tenant's branding profile
// (see BrandingProvider) and a CMS-like content store. Here it is static from content.json.
export function HeroSection({ content, meta }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-[#faf7f2]">
      <div className="absolute inset-0 -z-0 opacity-60 [background:radial-gradient(60%_50%_at_80%_10%,#f5d9c4_0%,transparent_60%),radial-gradient(40%_40%_at_10%_90%,#e9d5ff_0%,transparent_60%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="space-y-7"
        >
          {content.eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-300/70 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-widest text-stone-700 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> {content.eyebrow}
            </span>
          )}
          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-stone-900 md:text-6xl lg:text-7xl">
            {content.title.split("\n").map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-stone-600 md:text-xl">
            {content.subtitle}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full bg-stone-900 px-7 text-base hover:bg-stone-800">
              <a href={meta.primaryCtaUrl}>{meta.primaryCtaLabel}</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-stone-300 bg-white/60 px-7 text-base backdrop-blur hover:bg-white">
              <a href={meta.secondaryCtaUrl}>{meta.secondaryCtaLabel}</a>
            </Button>
          </div>
          {content.trustBadge && (
            <p className="pt-2 text-sm font-medium text-stone-500">{content.trustBadge}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl shadow-stone-900/20">
            <img src={content.image.src} alt={content.image.alt} className="h-full w-full object-cover" loading="eager" />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur md:block">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[
                  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80",
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80",
                ].map((src, i) => (
                  <img key={i} src={src} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover" />
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">+500 alumnos</p>
                <p className="text-xs text-stone-500">confían en Aurora</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
