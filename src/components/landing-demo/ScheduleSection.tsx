import { Calendar, Clock, MapPin, User, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleSectionProps {
  content: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    ctaLabel: string;
    ctaUrl: string;
    featuredClasses: {
      name: string;
      day: string;
      time: string;
      teacher: string;
      level: string;
      room: string;
    }[];
  };
}

// NOTE: In a real tenant, featuredClasses would be fetched from
// src/lib/api/schedules.ts → getPublicSchedule(tenantSlug) and updated live.
// Here we use static JSON content for demo purposes.
export function ScheduleSection({ content }: ScheduleSectionProps) {
  return (
    <section id="horarios" className="bg-stone-900 py-24 text-stone-100 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            {content.eyebrow && (
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                {content.eyebrow}
              </span>
            )}
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-white md:text-5xl">
              {content.title}
            </h2>
            {content.subtitle && (
              <p className="mt-5 text-lg leading-relaxed text-stone-300">{content.subtitle}</p>
            )}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              <Wifi className="h-3.5 w-3.5" /> Conectado en tiempo real al panel de la escuela
            </div>
            <div className="mt-8">
              <Button asChild size="lg" className="h-12 rounded-full bg-white px-7 text-base text-stone-900 hover:bg-stone-100">
                <a href={content.ctaUrl}>{content.ctaLabel}</a>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid gap-4 sm:grid-cols-2">
              {content.featuredClasses.map((c) => (
                <div
                  key={c.name}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition-colors hover:bg-white/[0.07]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl text-white">{c.name}</h3>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-stone-200">
                      {c.level}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-stone-300">
                    <li className="flex items-center gap-2"><Calendar className="h-4 w-4 text-stone-400" /> {c.day}</li>
                    <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-stone-400" /> {c.time}</li>
                    <li className="flex items-center gap-2"><User className="h-4 w-4 text-stone-400" /> {c.teacher}</li>
                    <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-stone-400" /> {c.room}</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
