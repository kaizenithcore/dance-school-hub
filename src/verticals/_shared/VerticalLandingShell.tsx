import type { ReactNode } from "react";
import type { VerticalId } from "@/lib/vertical/types";

/**
 * VerticalLandingShell
 * --------------------
 * Wraps a vertical landing page with per-vertical visual theming:
 *  - overrides CSS custom properties (--radius, --background tint, --primary variants)
 *  - injects a scoped <style> block that restyles headings, section dividers and decorative
 *    backgrounds only inside `[data-vertical="X"]`
 *
 * Logic and business rules are untouched: this is purely presentational.
 * Shared landing sections (Results, DecisionCompare, WebService, Weydi, Credibility, LandingFooter)
 * all rely on design tokens (bg-muted, text-primary, rounded-*) so they inherit the theme.
 */
export function VerticalLandingShell({
  id,
  children,
}: {
  id: Exclude<VerticalId, "dance">;
  children: ReactNode;
}) {
  return (
    <div data-vertical={id} className={`vertical-shell vertical-${id} min-h-screen bg-background text-foreground`}>
      <style>{THEME_CSS[id]}</style>
      {children}
    </div>
  );
}

/* ── Per-vertical CSS ────────────────────────────────────────────────────────
 * Scoped to `[data-vertical="X"]` so the main dance landing is never affected.
 * Focused on:  heading treatment, decorative section backdrops, accent hairlines.
 * Kept surgical: we do not fight Tailwind utility radii, we layer atmosphere on top.
 * ────────────────────────────────────────────────────────────────────────── */
const THEME_CSS: Record<Exclude<VerticalId, "dance">, string> = {
  languages: `
    [data-vertical="languages"] {
      --radius: 0.9rem;
      background:
        radial-gradient(1200px 600px at 90% -10%, hsl(158 60% 40% / 0.06), transparent 60%),
        radial-gradient(900px 500px at -10% 20%, hsl(38 80% 60% / 0.05), transparent 60%),
        hsl(var(--background));
    }
    [data-vertical="languages"] h1,
    [data-vertical="languages"] h2 {
      font-family: 'Georgia', 'Iowan Old Style', 'Times New Roman', serif;
      letter-spacing: -0.02em;
      font-weight: 600;
    }
    [data-vertical="languages"] h1 em,
    [data-vertical="languages"] h2 em { font-style: italic; color: hsl(var(--primary)); }
    [data-vertical="languages"] section + section { border-top: 1px solid hsl(var(--border) / 0.6); }
  `,
  sports: `
    [data-vertical="sports"] {
      --radius: 0.4rem;
      background:
        linear-gradient(180deg, hsl(210 80% 48% / 0.04) 0, transparent 240px),
        hsl(var(--background));
    }
    [data-vertical="sports"] h1,
    [data-vertical="sports"] h2 {
      font-family: 'Bebas Neue', 'Impact', 'Oswald', 'Helvetica Neue', sans-serif;
      letter-spacing: 0.01em;
      font-weight: 800;
      text-transform: uppercase;
    }
    [data-vertical="sports"] h3 { letter-spacing: -0.005em; font-weight: 700; }
    [data-vertical="sports"] section { position: relative; }
    [data-vertical="sports"] section::before {
      content: "";
      position: absolute; left: 0; right: 0; top: 0; height: 3px;
      background: repeating-linear-gradient(90deg, hsl(var(--primary)) 0 24px, transparent 24px 48px);
      opacity: 0.12;
    }
  `,
  tutoring: `
    [data-vertical="tutoring"] {
      --radius: 1.25rem;
      background:
        radial-gradient(1000px 500px at 100% 0%, hsl(28 80% 60% / 0.10), transparent 55%),
        radial-gradient(800px 400px at 0% 30%, hsl(340 70% 70% / 0.06), transparent 60%),
        hsl(var(--background));
    }
    [data-vertical="tutoring"] h1,
    [data-vertical="tutoring"] h2 {
      font-family: 'Nunito', 'Quicksand', 'Segoe UI', system-ui, sans-serif;
      letter-spacing: -0.025em;
      font-weight: 800;
    }
    [data-vertical="tutoring"] h1 span[class*="text-primary"],
    [data-vertical="tutoring"] h2 span[class*="text-primary"] {
      background: linear-gradient(180deg, transparent 62%, hsl(var(--primary) / 0.28) 62%);
      padding: 0 0.1em;
      border-radius: 0.2em;
    }
  `,
};
