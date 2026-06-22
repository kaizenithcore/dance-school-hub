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

  const publicMatch =
    matchPath("/s/:schoolSlug", location.pathname)
    || matchPath("/s/:schoolSlug/*", location.pathname);

  const isAdminRoute = location.pathname.startsWith("/admin");

  const loadBranding = useCallback(async () => {
    if (!isAdminRoute && !publicMatch) {
      setBranding(DEFAULT_BRANDING);
      return;
    }

    setIsLoading(true);
    try {
      if (publicMatch?.params.schoolSlug) {
        const publicBranding = await getPublicTenantBranding(publicMatch.params.schoolSlug);
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
  }, [isAdminRoute, publicMatch]);

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
