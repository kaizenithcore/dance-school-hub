import type { CSSProperties, ReactNode } from "react";
import type { VerticalId } from "@/lib/vertical/types";

/**
 * VerticalLandingShell
 * --------------------
 * Wraps a vertical landing with strong per-vertical visual theming.
 *
 * Why inline CSS vars on the wrapper (not just <style>)?
 *   `BrandingProvider` writes `--primary`, `--accent`, `--radius` on `:root` at runtime
 *   (default = dance purple when no tenant is loaded). Setting the same CSS custom
 *   properties as inline style on a descendant wrapper wins via the custom-property
 *   cascade — every child inherits the shell's values regardless of what :root holds.
 *
 * Each vertical also gets:
 *   - a distinct base radius, primary hue and accent hue
 *   - a scoped <style> block that restyles headings, cards, buttons, chips and
 *     decorative section backgrounds only inside `[data-vertical="X"]`
 *   - a full-bleed ambient backdrop so each vertical FEELS different at a glance
 *
 * Logic/business rules are untouched — purely presentational.
 */
type Vid = Exclude<VerticalId, "dance">;

interface Theme {
  primary: string;      // HSL triplet, no hsl()
  primaryGlow: string;
  accent: string;
  ring: string;
  radius: string;       // e.g. "0.4rem"
  background: string;   // full CSS background value
}

const THEMES: Record<Vid, Theme> = {
  languages: {
    // Emerald + warm ivory — editorial / academic
    primary: "158 65% 34%",
    primaryGlow: "158 55% 55%",
    accent: "42 55% 92%",
    ring: "158 65% 34%",
    radius: "0.9rem",
    background: `
      radial-gradient(1200px 600px at 90% -10%, hsl(158 65% 34% / 0.09), transparent 60%),
      radial-gradient(900px 500px at -10% 20%, hsl(38 75% 65% / 0.10), transparent 60%),
      hsl(42 40% 98%)
    `,
  },
  sports: {
    // Electric blue + graphite — kinetic / stadium
    primary: "215 92% 44%",
    primaryGlow: "48 100% 55%",
    accent: "215 30% 94%",
    ring: "215 92% 44%",
    radius: "0.35rem",
    background: `
      linear-gradient(180deg, hsl(215 92% 44% / 0.08) 0, transparent 340px),
      hsl(215 25% 98%)
    `,
  },
  tutoring: {
    // Warm coral + peach — friendly / mentor
    primary: "18 85% 52%",
    primaryGlow: "340 75% 62%",
    accent: "28 80% 92%",
    ring: "18 85% 52%",
    radius: "1.25rem",
    background: `
      radial-gradient(1100px 550px at 100% 0%, hsl(28 85% 62% / 0.16), transparent 55%),
      radial-gradient(900px 450px at 0% 30%, hsl(340 75% 72% / 0.10), transparent 60%),
      hsl(30 60% 98%)
    `,
  },
};

export function VerticalLandingShell({
  id,
  children,
}: {
  id: Vid;
  children: ReactNode;
}) {
  const t = THEMES[id];
  // Inline vars beat BrandingProvider's :root inline vars via nearest-ancestor inheritance.
  const styleVars = {
    "--primary": t.primary,
    "--primary-foreground": "0 0% 100%",
    "--accent": t.accent,
    "--ring": t.ring,
    "--radius": t.radius,
    "--sidebar-primary": t.primary,
    "--v-glow": t.primaryGlow,
    background: t.background,
  } as CSSProperties;

  return (
    <div
      data-vertical={id}
      className={`vertical-shell vertical-${id} min-h-screen text-foreground`}
      style={styleVars}
    >
      <style>{THEME_CSS[id]}</style>
      {children}
    </div>
  );
}

/* ── Per-vertical scoped CSS ─────────────────────────────────────────────────
 * Selectors are scoped to `[data-vertical="X"]` so the main dance landing is
 * never affected. We layer:
 *   - heading treatment (font, weight, case)
 *   - card & button silhouette
 *   - decorative section markers
 *   - hero-scale bump so each vertical has a distinct rhythm
 * ────────────────────────────────────────────────────────────────────────── */
const THEME_CSS: Record<Vid, string> = {
  // ── LANGUAGES: editorial, serif, warm hairlines, slim cards ────────────────
  languages: `
    [data-vertical="languages"] h1,
    [data-vertical="languages"] h2 {
      font-family: 'Iowan Old Style','Palatino Linotype','Georgia','Times New Roman',serif;
      letter-spacing: -0.022em;
      font-weight: 600;
    }
    [data-vertical="languages"] h1 { font-size: clamp(2.6rem, 5.2vw, 4.2rem); line-height: 1.02; }
    [data-vertical="languages"] h1 .text-primary,
    [data-vertical="languages"] h2 .text-primary { font-style: italic; }
    [data-vertical="languages"] .bg-card {
      border-color: hsl(var(--border) / 0.5);
      background: linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(42 40% 99%) 100%);
    }
    [data-vertical="languages"] button, [data-vertical="languages"] a[class*="rounded-xl"] {
      letter-spacing: 0.01em;
    }
    [data-vertical="languages"] section + section {
      border-top: 1px solid hsl(var(--border) / 0.5);
    }
    [data-vertical="languages"] section:has(> .container) > .container::before {
      content: "";
      display: block; width: 42px; height: 2px;
      background: hsl(var(--primary)); margin: 0 auto 1.25rem;
      opacity: 0.6;
    }
  `,

  // ── SPORTS: bold, condensed, uppercase, sharp cards, stadium stripes ───────
  sports: `
    [data-vertical="sports"] h1,
    [data-vertical="sports"] h2 {
      font-family: 'Bebas Neue','Oswald','Impact','Anton','Helvetica Neue',sans-serif;
      letter-spacing: 0.015em;
      font-weight: 800;
      text-transform: uppercase;
      line-height: 0.98;
    }
    [data-vertical="sports"] h1 { font-size: clamp(3rem, 6.2vw, 5.4rem); }
    [data-vertical="sports"] h2 { font-size: clamp(2rem, 3.6vw, 3rem); }
    [data-vertical="sports"] h3 { font-weight: 700; letter-spacing: -0.005em; }
    [data-vertical="sports"] p { letter-spacing: 0.005em; }

    /* Sharp cards & buttons */
    [data-vertical="sports"] [class*="rounded-xl"],
    [data-vertical="sports"] [class*="rounded-2xl"],
    [data-vertical="sports"] [class*="rounded-lg"] { border-radius: 0.35rem !important; }
    [data-vertical="sports"] [class*="rounded-full"] { border-radius: 9999px !important; }

    /* Stadium diagonal stripe on top of every section */
    [data-vertical="sports"] section { position: relative; }
    [data-vertical="sports"] section::before {
      content: "";
      position: absolute; left: 0; right: 0; top: 0; height: 4px;
      background: repeating-linear-gradient(90deg,
        hsl(var(--primary)) 0 22px, hsl(var(--v-glow)) 22px 44px, transparent 44px 66px);
      opacity: 0.14;
    }
    /* Kinetic underline behind primary emphasis */
    [data-vertical="sports"] h1 .text-primary,
    [data-vertical="sports"] h2 .text-primary {
      background: linear-gradient(180deg, transparent 78%, hsl(var(--v-glow) / 0.55) 78%);
      padding: 0 0.08em;
    }
    /* Feature icon tiles: square, filled */
    [data-vertical="sports"] .bg-primary\\/10 {
      background: hsl(var(--primary)) !important;
      color: hsl(var(--primary-foreground)) !important;
    }
    [data-vertical="sports"] .bg-primary\\/10 > svg { color: hsl(var(--primary-foreground)); }
  `,

  // ── TUTORING: friendly, rounded, highlighter marker, cozy peach ───────────
  tutoring: `
    [data-vertical="tutoring"] h1,
    [data-vertical="tutoring"] h2 {
      font-family: 'Nunito','Quicksand','Segoe UI',system-ui,sans-serif;
      letter-spacing: -0.028em;
      font-weight: 800;
      line-height: 1.05;
    }
    [data-vertical="tutoring"] h1 { font-size: clamp(2.8rem, 5.8vw, 4.6rem); }

    /* Extra-rounded silhouettes across cards & buttons */
    [data-vertical="tutoring"] [class*="rounded-xl"] { border-radius: 1.25rem !important; }
    [data-vertical="tutoring"] [class*="rounded-2xl"] { border-radius: 1.5rem !important; }
    [data-vertical="tutoring"] [class*="rounded-lg"] { border-radius: 1rem !important; }

    /* Highlighter marker behind primary word */
    [data-vertical="tutoring"] h1 .text-primary,
    [data-vertical="tutoring"] h2 .text-primary {
      background: linear-gradient(180deg, transparent 60%, hsl(var(--primary) / 0.30) 60%);
      padding: 0 0.12em;
      border-radius: 0.25em;
    }
    /* Cards get a warm peach tint + soft depth */
    [data-vertical="tutoring"] .bg-card {
      background: linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(28 70% 98%) 100%);
      box-shadow: 0 1px 0 hsl(28 60% 90%), 0 8px 24px -18px hsl(18 85% 52% / 0.35);
    }
    /* Feature icon tiles softened peach */
    [data-vertical="tutoring"] .bg-primary\\/10 {
      background: hsl(var(--primary) / 0.14) !important;
    }
  `,
};
