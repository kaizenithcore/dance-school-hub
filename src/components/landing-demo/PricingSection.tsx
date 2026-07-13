import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingSectionProps {
  content: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    ctaUrl: string;
    plans: {
      name: string;
      price: string;
      period?: string;
      description?: string;
      features: string[];
      ctaLabel: string;
      highlighted?: boolean;
      badge?: string;
    }[];
    footnote?: string;
  };
}

// NOTE: In a real tenant, plans would come from src/lib/api/pricing.ts → listPublicPricing(tenantSlug).
export function PricingSection({ content }: PricingSectionProps) {
  return (
    <section id="precios" className="bg-[#faf7f2] py-24 md:py-32">
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

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {content.plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl p-8 ${
                plan.highlighted
                  ? "bg-stone-900 text-stone-100 shadow-2xl shadow-stone-900/20 ring-1 ring-stone-900"
                  : "bg-white text-stone-900 ring-1 ring-stone-200"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-900">
                  {plan.badge}
                </span>
              )}
              <h3 className="font-serif text-2xl tracking-tight">{plan.name}</h3>
              {plan.description && (
                <p className={`mt-2 text-sm ${plan.highlighted ? "text-stone-300" : "text-stone-600"}`}>
                  {plan.description}
                </p>
              )}
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-serif text-5xl tracking-tight">{plan.price}</span>
                {plan.period && (
                  <span className={`text-sm ${plan.highlighted ? "text-stone-400" : "text-stone-500"}`}>
                    {plan.period}
                  </span>
                )}
              </div>
              <ul className="mt-8 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? "text-emerald-400" : "text-emerald-600"}`} />
                    <span className={plan.highlighted ? "text-stone-200" : "text-stone-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className={`mt-10 h-12 rounded-full ${
                  plan.highlighted
                    ? "bg-white text-stone-900 hover:bg-stone-100"
                    : "bg-stone-900 text-white hover:bg-stone-800"
                }`}
              >
                <a href={content.ctaUrl}>{plan.ctaLabel}</a>
              </Button>
            </div>
          ))}
        </div>

        {content.footnote && (
          <p className="mt-10 text-center text-sm text-stone-500">{content.footnote}</p>
        )}
      </div>
    </section>
  );
}
