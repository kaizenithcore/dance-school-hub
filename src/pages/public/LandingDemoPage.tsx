import { useEffect } from "react";
import content from "@/data/landing-demo/content.json";
import { LandingHeader } from "@/components/landing-demo/LandingHeader";
import { HeroSection } from "@/components/landing-demo/HeroSection";
import { AboutSection } from "@/components/landing-demo/AboutSection";
import { DisciplinesSection } from "@/components/landing-demo/DisciplinesSection";
import { ScheduleSection } from "@/components/landing-demo/ScheduleSection";
import { PricingSection } from "@/components/landing-demo/PricingSection";

// ── Section renderer registry ─────────────────────────────────────────────
// Maps each `type` from content.json to its React component.
// To add a new section, build the component and register it here.
const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
  hero: HeroSection,
  about: AboutSection,
  disciplines: DisciplinesSection,
  schedule: ScheduleSection,
  pricing: PricingSection,
};

interface Section {
  id: string;
  type: string;
  enabled: boolean;
  order: number;
  content: Record<string, unknown>;
}

/**
 * /landing-demo — public demo landing for the "Landing integrada" upsell.
 *
 * Content engine:
 *  - Reads `src/data/landing-demo/content.json`
 *  - Filters sections by `enabled: true`
 *  - Sorts by `order`
 *  - Renders the component registered for each `type`
 *
 * In production, a real tenant landing would:
 *  - Read branding from BrandingProvider (logo, primary color, font)
 *  - Hydrate schedule via src/lib/api/schedules.ts (public endpoint)
 *  - Hydrate pricing via src/lib/api/pricing.ts (public endpoint)
 *  - Load content from a tenant-scoped CMS / Supabase row instead of JSON.
 */
export default function LandingDemoPage() {
  const sections = (content.sections as Section[])
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${content.meta.schoolFullName} · Clases de danza en Madrid`;
    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 antialiased [font-feature-settings:'ss01']">
      <LandingHeader meta={content.meta} />

      <main>
        {sections.map((section) => {
          const Component = SECTION_COMPONENTS[section.type];
          if (!Component) {
            if (import.meta.env.DEV) {
              console.warn(`[landing-demo] No component registered for section type "${section.type}"`);
            }
            return null;
          }
          return (
            <Component
              key={section.id}
              content={section.content}
              meta={content.meta}
            />
          );
        })}
      </main>

      <footer id="contacto" className="border-t border-stone-200 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-stone-500 md:flex-row">
          <p>© {new Date().getFullYear()} {content.meta.schoolFullName} · {content.meta.location}</p>
          <p>Hecho con Nexa · Landing integrada</p>
        </div>
      </footer>
    </div>
  );
}
