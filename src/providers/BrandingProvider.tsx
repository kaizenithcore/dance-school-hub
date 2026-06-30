import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { matchPath, useLocation } from "react-router-dom";
import {
  getPublicTenantBranding,
  getTenantBranding,
  type BrandingFontFamily,
  type BrandingStyleVariant,
  type TenantBranding,
} from "@/lib/api/branding";

interface BrandingTheme {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: BrandingFontFamily;
  styleVariant: BrandingStyleVariant;
}

interface BrandingContextValue {
  branding: BrandingTheme;
  isLoading: boolean;
  setPreviewBranding: (value: Partial<BrandingTheme> | null) => void;
  refreshBranding: () => Promise<void>;
}

const DEFAULT_BRANDING: BrandingTheme = {
  logoUrl: null,
  primaryColor: "#7C3AED",
  secondaryColor: "#F1F5F9",
  accentColor: "#A78BFA",
  fontFamily: "inter",
  styleVariant: "clean",
};

const fontFamilyMap: Record<BrandingFontFamily, string> = {
  inter: '"Inter", system-ui, sans-serif',
  poppins: '"Poppins", system-ui, sans-serif',
  montserrat: '"Montserrat", system-ui, sans-serif',
  lato: '"Lato", system-ui, sans-serif',
};

const styleRadiusMap: Record<BrandingStyleVariant, string> = {
  clean: "0.75rem",
  rounded: "1rem",
  bold: "0.55rem",
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function hexToHslString(hex: string): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getReadableForegroundHsl(hex: string): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const relativeLuminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

  // WCAG: luminance below ~0.32 is "dark" — use a light foreground for contrast.
  return relativeLuminance < 0.32 ? "0 0% 98%" : "263 50% 25%";
}

function mapApiBrandingToTheme(data: TenantBranding): BrandingTheme {
  return {
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    accentColor: data.accent_color || DEFAULT_BRANDING.accentColor,
    fontFamily: data.font_family,
    styleVariant: data.style_variant,
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [branding, setBranding] = useState<BrandingTheme>(DEFAULT_BRANDING);
  const [previewBranding, setPreviewBrandingState] = useState<Partial<BrandingTheme> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const effectiveBranding = useMemo(
    () => ({ ...branding, ...(previewBranding || {}) }),
    [branding, previewBranding]
  );

  // ── Extract PRIMITIVE values from the location so useCallback deps are stable ──
  //
  // Bug (before): matchPath() returns a NEW object reference on every render even
  // when the URL hasn't changed.  Putting that object in useCallback's dep array
  // caused loadBranding to be recreated every render → useEffect fired every
  // render → setIsLoading() → new render → infinite loop.
  //
  // Fix: derive string | null and boolean (primitives) once with useMemo so React
  // can compare them by VALUE, not by reference.

  const schoolSlug = useMemo<string | null>(() => {
    const m =
      matchPath("/s/:schoolSlug", location.pathname) ||
      matchPath("/s/:schoolSlug/*", location.pathname);
    return m?.params.schoolSlug ?? null;
  }, [location.pathname]);

  const isAdminRoute = useMemo(
    () => location.pathname.startsWith("/admin"),
    [location.pathname]
  );

  const loadBranding = useCallback(async () => {
    if (!schoolSlug && !isAdminRoute) {
      setBranding(DEFAULT_BRANDING);
      return;
    }

    setIsLoading(true);
    try {
      if (schoolSlug) {
        const publicBranding = await getPublicTenantBranding(schoolSlug);
        if (publicBranding?.branding) {
          setBranding(mapApiBrandingToTheme(publicBranding.branding));
          return;
        }
      }

      if (isAdminRoute) {
        const tenantBranding = await getTenantBranding();
        if (tenantBranding) {
          setBranding(mapApiBrandingToTheme(tenantBranding));
          return;
        }
      }

      setBranding(DEFAULT_BRANDING);
    } finally {
      setIsLoading(false);
    }
  }, [schoolSlug, isAdminRoute]); // primitives — stable across renders at same URL

  useEffect(() => {
    void loadBranding();
  }, [loadBranding]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", effectiveBranding.primaryColor);
    root.style.setProperty("--brand-secondary", effectiveBranding.secondaryColor);
    root.style.setProperty("--brand-accent", effectiveBranding.accentColor);
    root.style.setProperty("--brand-font-family", fontFamilyMap[effectiveBranding.fontFamily]);
    root.style.setProperty("--primary", hexToHslString(effectiveBranding.primaryColor));
    root.style.setProperty("--ring", hexToHslString(effectiveBranding.primaryColor));
    root.style.setProperty("--sidebar-primary", hexToHslString(effectiveBranding.primaryColor));
    root.style.setProperty("--secondary", hexToHslString(effectiveBranding.secondaryColor));
    root.style.setProperty("--accent", hexToHslString(effectiveBranding.accentColor));
    const accentForeground = getReadableForegroundHsl(effectiveBranding.accentColor);
    root.style.setProperty("--accent-foreground", accentForeground);
    root.style.setProperty("--sidebar-accent-foreground", accentForeground);
    root.style.setProperty("--radius", styleRadiusMap[effectiveBranding.styleVariant]);
  }, [effectiveBranding]);

  const setPreviewBranding = useCallback((value: Partial<BrandingTheme> | null) => {
    setPreviewBrandingState(value);
  }, []);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding: effectiveBranding,
      isLoading,
      setPreviewBranding,
      refreshBranding: loadBranding,
    }),
    [effectiveBranding, isLoading, loadBranding, setPreviewBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used inside BrandingProvider");
  }
  return context;
}

export function defaultBrandingTheme(): BrandingTheme {
  return { ...DEFAULT_BRANDING };
}
