import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

export type PortalPersona = "prospect" | "enrolled" | "community";

export interface PortalPersonaOption {
  id: PortalPersona;
  label: string;
  description: string;
}

export const PORTAL_PERSONA_OPTIONS: PortalPersonaOption[] = [
  {
    id: "prospect",
    label: "Sin matricula",
    description: "Usuario con perfil creado sin escuela conectada.",
  },
  {
    id: "enrolled",
    label: "Matriculado",
    description: "Alumno activo con clases, progreso y certificaciones.",
  },
  {
    id: "community",
    label: "Comunidad",
    description: "Alumno con modulo social y eventos colaborativos activos.",
  },
];

const STORAGE_KEY = "nexa:portal:persona";

interface PortalPersonaContextValue {
  persona: PortalPersona;
  setPersona: (value: PortalPersona) => void;
  options: PortalPersonaOption[];
}

const PortalPersonaContext = createContext<PortalPersonaContextValue | null>(null);

function normalizePersona(value: string | null): PortalPersona | null {
  if (value === "prospect" || value === "enrolled" || value === "community") {
    return value;
  }
  return null;
}

function readStoredPersona(): PortalPersona {
  if (typeof window === "undefined") {
    return "enrolled";
  }

  return normalizePersona(window.localStorage.getItem(STORAGE_KEY)) ?? "enrolled";
}

export function PortalPersonaProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [persona, setPersonaState] = useState<PortalPersona>(() => {
    const fromQuery = normalizePersona(searchParams.get("persona"));
    return fromQuery ?? readStoredPersona();
  });

  const setPersona = (value: PortalPersona) => {
    setPersonaState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value);
    }

    const next = new URLSearchParams(searchParams);
    next.set("persona", value);
    setSearchParams(next, { replace: true });
  };

  const value = useMemo<PortalPersonaContextValue>(
    () => ({
      persona,
      setPersona,
      options: PORTAL_PERSONA_OPTIONS,
    }),
    [persona]
  );

  return <PortalPersonaContext.Provider value={value}>{children}</PortalPersonaContext.Provider>;
}

export function usePortalPersona() {
  const context = useContext(PortalPersonaContext);
  if (!context) {
    throw new Error("usePortalPersona must be used within PortalPersonaProvider");
  }

  return context;
}
