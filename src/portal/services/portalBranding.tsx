/**
 * Portal branding service.
 *
 * Fetches the school's branding (logo, colors, font) using the public
 * branding endpoint — no admin auth required.
 *
 * Flow:
 *   1. getStudentPortalContext() → tenantSlug + schoolName
 *   2. getPublicTenantBranding(slug) → TenantBranding
 *   3. Exposes { logoUrl, primaryColor, schoolName } to portal screens
 *      and applies CSS custom properties scoped to the portal shell.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getPublicTenantBranding, type TenantBranding } from "@/lib/api/branding";
import { getStudentPortalContext } from "@/lib/api/studentPortal";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PortalBranding {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  styleVariant: "clean" | "rounded" | "bold";
  schoolName: string;
  tenantSlug: string;
}

interface PortalBrandingContextValue {
  branding: PortalBranding;
  isLoading: boolean;
}

// ── Defaults ───────────────────────────────────────────────────────────────────

const DEFAULT_BRANDING: PortalBranding = {
  logoUrl: null,
  primaryColor: "#7C3AED",
  accentColor: "#A78BFA",
  fontFamily: '"Inter", system-ui, sans-serif',
  styleVariant: "clean",
  schoolName: "",
  tenantSlug: "",
};

const FONT_MAP: Record<string, string> = {
  inter: '"Inter", system-ui, sans-serif',
  poppins: '"Poppins", system-ui, sans-serif',
  montserrat: '"Montserrat", system-ui, sans-serif',
  lato: '"Lato", system-ui, sans-serif',
};

const RADIUS_MAP: Record<string, string> = {
  clean: "0.75rem",
  rounded: "1rem",
  bold: "0.55rem",
};

// ── Color conversion (same as BrandingProvider) ───────────────────────────────

function hexToHsl(hex: string): string {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / delta) % 6; break;
      case g: h = (b - r) / delta + 2; break;
      default: h = (r - g) / delta + 4; break;
    }
    h = (h * 60 + 360) % 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function apiBrandingToPortal(data: TenantBranding, schoolName: string, tenantSlug: string): PortalBranding {
  return {
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    accentColor: data.accent_color || DEFAULT_BRANDING.accentColor,
    fontFamily: FONT_MAP[data.font_family] ?? FONT_MAP.inter,
    styleVariant: data.style_variant,
    schoolName,
    tenantSlug,
  };
}

function applyCssVars(branding: PortalBranding, root: HTMLElement) {
  root.style.setProperty("--brand-primary", branding.primaryColor);
  root.style.setProperty("--brand-accent", branding.accentColor);
  root.style.setProperty("--brand-font-family", branding.fontFamily);
  root.style.setProperty("--primary", hexToHsl(branding.primaryColor));
  root.style.setProperty("--ring", hexToHsl(branding.primaryColor));
  root.style.setProperty("--accent", hexToHsl(branding.accentColor));
  root.style.setProperty("--radius", RADIUS_MAP[branding.styleVariant] ?? RADIUS_MAP.clean);
}

// ── Context ────────────────────────────────────────────────────────────────────

const PortalBrandingCtx = createContext<PortalBrandingContextValue>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
});

export function PortalBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<PortalBranding>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    void (async () => {
      try {
        const ctx = await getStudentPortalContext();
        const slug = ctx.tenantSlug;
        const schoolName = ctx.schoolName;

        if (slug) {
          const pub = await getPublicTenantBranding(slug);
          if (pub?.branding) {
            setBranding(apiBrandingToPortal(pub.branding, schoolName, slug));
            return;
          }
        }

        // Fallback: set school name even without branding data
        setBranding((prev) => ({ ...prev, schoolName, tenantSlug: slug ?? "" }));
      } catch {
        // Non-fatal: portal works without custom branding
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Apply CSS variables whenever branding changes
  useEffect(() => {
    if (!isLoading) {
      applyCssVars(branding, document.documentElement);
    }
  }, [branding, isLoading]);

  const value = useMemo(() => ({ branding, isLoading }), [branding, isLoading]);

  return <PortalBrandingCtx.Provider value={value}>{children}</PortalBrandingCtx.Provider>;
}

export function usePortalBranding(): PortalBrandingContextValue {
  return useContext(PortalBrandingCtx);
}
