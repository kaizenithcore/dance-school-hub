import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { VerticalConfig, VerticalId, Vocabulary } from "./types";
import { danceConfig } from "./configs/dance";
import { sportsConfig } from "./configs/sports";
import { languagesConfig } from "./configs/languages";
import { tutoringConfig } from "./configs/tutoring";

const configs: Record<VerticalId, VerticalConfig> = {
  dance: danceConfig,
  sports: sportsConfig,
  languages: languagesConfig,
  tutoring: tutoringConfig,
};

const DEV_VERTICAL_KEY = "dev_vertical";

export function resolveVerticalId(): VerticalId {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem(DEV_VERTICAL_KEY);
    if (stored && stored in configs) return stored as VerticalId;
  }
  const raw = import.meta.env.VITE_VERTICAL as string | undefined;
  if (raw && raw in configs) return raw as VerticalId;
  return "dance";
}

export function setDevVertical(id: VerticalId): void {
  if (!import.meta.env.DEV) return;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(DEV_VERTICAL_KEY, id);
    window.location.reload();
  }
}

const VerticalContext = createContext<VerticalConfig>(danceConfig);

export function VerticalProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => configs[resolveVerticalId()], []);

  useMemo(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--primary", config.primaryColor);
      document.documentElement.style.setProperty("--accent", config.accentColor);
    }
  }, [config]);

  return <VerticalContext.Provider value={config}>{children}</VerticalContext.Provider>;
}

export function useVerticalConfig(): VerticalConfig {
  return useContext(VerticalContext);
}

export function useVocabulary(): Vocabulary {
  return useContext(VerticalContext).vocabulary;
}

export function useVerticalFeature(key: string): boolean {
  return useContext(VerticalContext).verticalFeatures.includes(key);
}
