import type { ReactNode } from "react";
import type { VerticalId } from "@/lib/vertical/types";

/**
 * VerticalLandingShell
 * --------------------
 * Wraps a vertical landing page with per-vertical visual theming. Overrides the
 * design tokens (--primary, --accent, --ring, --radius, --background, etc.) so
 * that shared sections (Results, DecisionCompare, Pricing, WebService, Weydi,
 * Credibility) automatically pick up the vertical's palette without touching
 * their code. Also injects decorative CSS scoped to `[data-vertical="X"]` so
 * each vertical has a clearly distinct visual language beyond color + type.
 *
 * The dance landing is the "canonical" purple design and does NOT use this
 * shell — that's why <VerticalId> excludes it here.
 */
export function VerticalLandingShell({
  id,
  children,
}: {
  id: Exclude<VerticalId, "dance">;
  children: ReactNode;
}) {
  return (
    <div
      data-vertical={id}
      className={`vertical-shell vertical-${id} min-h-screen bg-background text-foreground`}
    >
      <style>{THEME_CSS[id]}</style>
      {children}
    </div>
  );
}

/* ── Per-vertical theming ─────────────────────────────────────────────────────
 * Each block redefines the core design tokens INSIDE `[data-vertical="X"]`, so
 * every Tailwind utility that reads them (bg-primary, text-primary, border-*,
 * ring-*, bg-accent, etc.) recolours automatically. The dance route never sets
 * `data-vertical`, so it keeps the global purple theme.
 *
 * Palettes are chosen to feel native to each sector:
 *  - languages  → editorial emerald + warm parchment
 *  - sports     → high-energy crimson/orange on graphite
 *  - tutoring   → warm amber + rose, soft & rounded
 * ────────────────────────────────────────────────────────────────────────── */
const THEME_CSS: Record<Exclude<VerticalId, "dance">, string> = {
  // ── LANGUAGES ─────────────────────────────────────────────────────────────
  // Editorial, calm, "language school / library" feel. Deep emerald primary,
  // warm parchment background, serif display type, generous radii.
  languages: `
    [data-vertical="languages"] {
      --background: 40 30% 96%;
      --foreground: 165 40% 8%;
      --card: 40 40% 99%;
      --card-foreground: 165 40% 8%;
      --popover: 40 40% 99%;
      --popover-foreground: 165 40% 8%;
      --primary: 165 70% 24%;
      --primary-foreground: 40 40% 98%;
      --secondary: 40 25% 92%;
      --secondary-foreground: 165 40% 8%;
      --muted: 40 20% 93%;
      --muted-foreground: 165 15% 32%;
      --accent: 40 60% 88%;
      --accent-foreground: 165 70% 20%;
      --border: 40 20% 86%;
      --input: 40 20% 86%;
      --ring: 165 70% 24%;
      --radius: 1rem;
      --sidebar-primary: 165 70% 24%;
      --sidebar-accent: 40 60% 88%;
      --sidebar-accent-foreground: 165 70% 20%;
      background:
        radial-gradient(1200px 700px at 92% -10%, hsl(165 70% 24% / 0.10), transparent 60%),
        radial-gradient(900px 500px at -8% 25%, hsl(30 80% 60% / 0.10), transparent 60%),
        hsl(var(--background));
    }
    [data-vertical="languages"] h1,
    [data-vertical="languages"] h2 {
      font-family: 'Cormorant Garamond', 'Georgia', 'Iowan Old Style', serif;
      letter-spacing: -0.015em;
      font-weight: 600;
    }
    [data-vertical="languages"] h1 { font-size: clamp(2.75rem, 5vw, 4.25rem); line-height: 1.05; }
    [data-vertical="languages"] h1 em,
    [data-vertical="languages"] h2 em { font-style: italic; color: hsl(var(--primary)); }
    [data-vertical="languages"] h1 span[class*="text-primary"],
    [data-vertical="languages"] h2 span[class*="text-primary"] {
      font-style: italic;
      font-weight: 500;
    }
    [data-vertical="languages"] section + section { border-top: 1px solid hsl(var(--border) / 0.7); }
    [data-vertical="languages"] .rounded-2xl,
    [data-vertical="languages"] .rounded-xl { border-radius: 1.1rem; }
    [data-vertical="languages"] button, [data-vertical="languages"] .rounded-full {
      letter-spacing: 0.005em;
    }
  `,

  // ── SPORTS ────────────────────────────────────────────────────────────────
  // High-energy, condensed uppercase headings, aggressive geometry, crimson
  // primary on near-black surfaces. Squared radii, jersey-stripe accents.
  sports: `
    [data-vertical="sports"] {
      --background: 220 15% 97%;
      --foreground: 220 30% 8%;
      --card: 0 0% 100%;
      --card-foreground: 220 30% 8%;
      --popover: 0 0% 100%;
      --popover-foreground: 220 30% 8%;
      --primary: 12 88% 50%;
      --primary-foreground: 0 0% 100%;
      --secondary: 220 15% 92%;
      --secondary-foreground: 220 30% 8%;
      --muted: 220 15% 94%;
      --muted-foreground: 220 12% 36%;
      --accent: 12 90% 96%;
      --accent-foreground: 12 88% 40%;
      --border: 220 15% 88%;
      --input: 220 15% 88%;
      --ring: 12 88% 50%;
      --radius: 0.25rem;
      --sidebar-primary: 12 88% 50%;
      --sidebar-accent: 12 90% 96%;
      --sidebar-accent-foreground: 12 88% 40%;
      background:
        linear-gradient(180deg, hsl(220 30% 8% / 0.06) 0, transparent 320px),
        hsl(var(--background));
    }
    [data-vertical="sports"] h1,
    [data-vertical="sports"] h2 {
      font-family: 'Bebas Neue', 'Oswald', 'Impact', 'Helvetica Neue', sans-serif;
      letter-spacing: 0.02em;
      font-weight: 800;
      text-transform: uppercase;
      line-height: 0.95;
    }
    [data-vertical="sports"] h1 { font-size: clamp(3rem, 6.5vw, 5.5rem); }
    [data-vertical="sports"] h3 { text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
    [data-vertical="sports"] .rounded-2xl,
    [data-vertical="sports"] .rounded-xl,
    [data-vertical="sports"] .rounded-lg { border-radius: 0.35rem; }
    [data-vertical="sports"] .rounded-full { border-radius: 0.35rem; }
    [data-vertical="sports"] button { text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
    [data-vertical="sports"] section { position: relative; }
    [data-vertical="sports"] section::before {
      content: "";
      position: absolute; left: 0; right: 0; top: 0; height: 4px;
      background: repeating-linear-gradient(90deg,
        hsl(var(--primary)) 0 28px,
        hsl(220 30% 8%) 28px 32px,
        transparent 32px 60px);
      opacity: 0.18;
      pointer-events: none;
    }
    [data-vertical="sports"] .container > *:first-child h1::after,
    [data-vertical="sports"] .container > *:first-child h2::after {
      content: "";
      display: block;
      width: 84px; height: 6px;
      background: hsl(var(--primary));
      margin-top: 1rem;
    }
  `,

  // ── TUTORING ──────────────────────────────────────────────────────────────
  // Warm, welcoming, human. Amber primary + rose accent, soft rounded shapes,
  // rounded sans headings with a highlighter-marker effect on primary spans.
  tutoring: `
    [data-vertical="tutoring"] {
      --background: 34 60% 97%;
      --foreground: 22 40% 12%;
      --card: 34 70% 99%;
      --card-foreground: 22 40% 12%;
      --popover: 34 70% 99%;
      --popover-foreground: 22 40% 12%;
      --primary: 22 88% 52%;
      --primary-foreground: 0 0% 100%;
      --secondary: 34 40% 93%;
      --secondary-foreground: 22 40% 12%;
      --muted: 34 40% 94%;
      --muted-foreground: 22 20% 36%;
      --accent: 340 80% 94%;
      --accent-foreground: 340 70% 40%;
      --border: 34 30% 88%;
      --input: 34 30% 88%;
      --ring: 22 88% 52%;
      --radius: 1.5rem;
      --sidebar-primary: 22 88% 52%;
      --sidebar-accent: 340 80% 94%;
      --sidebar-accent-foreground: 340 70% 40%;
      background:
        radial-gradient(1100px 600px at 100% 0%, hsl(22 88% 62% / 0.16), transparent 55%),
        radial-gradient(900px 500px at 0% 30%, hsl(340 80% 72% / 0.14), transparent 60%),
        radial-gradient(600px 400px at 50% 110%, hsl(48 90% 65% / 0.10), transparent 60%),
        hsl(var(--background));
    }
    [data-vertical="tutoring"] h1,
    [data-vertical="tutoring"] h2 {
      font-family: 'Nunito', 'Quicksand', 'Segoe UI', system-ui, sans-serif;
      letter-spacing: -0.03em;
      font-weight: 900;
    }
    [data-vertical="tutoring"] h1 { line-height: 1.05; }
    [data-vertical="tutoring"] h1 span[class*="text-primary"],
    [data-vertical="tutoring"] h2 span[class*="text-primary"] {
      background: linear-gradient(180deg, transparent 60%, hsl(48 95% 68% / 0.7) 60%);
      padding: 0 0.15em;
      border-radius: 0.3em;
      color: hsl(var(--foreground));
    }
    [data-vertical="tutoring"] .rounded-xl { border-radius: 1.25rem; }
    [data-vertical="tutoring"] .rounded-2xl { border-radius: 1.75rem; }
    [data-vertical="tutoring"] .rounded-lg { border-radius: 1rem; }
    [data-vertical="tutoring"] button { border-radius: 999px; }
    [data-vertical="tutoring"] .shadow-lg,
    [data-vertical="tutoring"] .shadow-xl {
      box-shadow: 0 20px 45px -20px hsl(22 88% 52% / 0.35);
    }
  `,
};
