/**
 * OnboardingShell — renders all first-run and contextual-help overlays.
 *
 * Responsibilities:
 *   - Welcome overlay (shown for ~2s on first login)
 *   - Section intro modals (auto-shown once per section, auto-dismissed after 3.5s)
 *   - CircleHelp button (reopens section intro or onboarding panel)
 *   - OnboardingPanel (guided 5-step setup)
 *
 * All overlays use fixed positioning so this component can be a sibling to
 * the main content rather than a wrapper around it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CircleHelp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { useBillingShellState } from "@/components/layout/BillingContext";
import { useAuth } from "@/contexts/AuthContext";

// ── Constants ──────────────────────────────────────────────────────────────────

const LOGIN_WELCOME_KEY = "nexa:welcome-overlay-until";
const LOGIN_WELCOME_DURATION_MS = 2000;
const SECTION_INTRO_STORAGE_KEY = "nexa:admin-section-intros:v1";
const SECTION_INTRO_MODAL_DURATION_MS = 3500;
const FIRST_LOGIN_GUIDE_PENDING_KEY = "nexa:first-login-guide-pending";
const FIRST_LOGIN_GUIDE_SHOWN_KEY = "nexa:first-login-guide-shown:v1";
const QUICK_HELP_HINT_AUTOHIDE_MS = 2600;

// ── Section intros ─────────────────────────────────────────────────────────────

type SectionIntro = { key: string; title: string; summary: string };

const SECTION_INTROS: Array<{ prefix: string; intro: SectionIntro }> = [
  {
    prefix: "/admin/school",
    intro: {
      key: "portal",
      title: "Portal del alumno",
      summary: "Gestiona el canal digital de tu escuela: publicaciones, avisos, galería y analíticas del portal.",
    },
  },
  {
    prefix: "/admin/renewals",
    intro: {
      key: "renovaciones",
      title: "Renovaciones",
      summary: "Automatiza las renovaciones de matrícula y ahorra horas al inicio de cada curso.",
    },
  },
  {
    prefix: "/admin/payments",
    intro: {
      key: "cobros",
      title: "Cobros",
      summary: "Registra pagos, genera recibos y controla el estado de cobro de cada alumno.",
    },
  },
  {
    prefix: "/admin/students",
    intro: {
      key: "alumnos",
      title: "Alumnos",
      summary: "Gestiona fichas, inscripciones y el historial completo de cada alumno.",
    },
  },
  {
    prefix: "/admin/settings",
    intro: {
      key: "configuracion",
      title: "Configuración",
      summary: "Ajusta los parámetros operativos de tu escuela: agenda, cobros, avisos y plan.",
    },
  },
  {
    prefix: "/admin",
    intro: {
      key: "inicio",
      title: "Inicio",
      summary: "Vista general del estado de tu escuela con los accesos más importantes del día.",
    },
  },
];

function getSectionIntro(pathname: string): SectionIntro | null {
  const match = SECTION_INTROS.find((s) => pathname.startsWith(s.prefix));
  return match ? match.intro : null;
}

function readSeenIntros(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SECTION_INTRO_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function persistSeenIntros(seen: Set<string>) {
  window.localStorage.setItem(SECTION_INTRO_STORAGE_KEY, JSON.stringify(Array.from(seen)));
}

// ── Component ──────────────────────────────────────────────────────────────────

export function OnboardingShell() {
  const location = useLocation();
  const { authContext } = useAuth();
  const { showTrialLockModal, showTrialLoadingModal } = useBillingShellState();
  const isTrialBlocking = showTrialLockModal || showTrialLoadingModal;

  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [showFirstLoginGuide, setShowFirstLoginGuide] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeSectionIntro, setActiveSectionIntro] = useState<SectionIntro | null>(null);
  const [showQuickHelpHint, setShowQuickHelpHint] = useState(false);

  const lastIntroPathRef = useRef<string | null>(null);
  const quickHelpHideTimerRef = useRef<number | null>(null);

  const sectionIntroForPath = useMemo(
    () => getSectionIntro(location.pathname),
    [location.pathname]
  );

  // Welcome overlay on first login
  useEffect(() => {
    const raw = window.sessionStorage.getItem(LOGIN_WELCOME_KEY);
    if (!raw) return;
    const until = Number(raw);
    window.sessionStorage.removeItem(LOGIN_WELCOME_KEY);
    if (!Number.isFinite(until)) return;
    const remaining = Math.max(0, until - Date.now());
    if (remaining === 0) return;
    setShowWelcomeOverlay(true);
    const timer = window.setTimeout(() => setShowWelcomeOverlay(false), Math.min(remaining, LOGIN_WELCOME_DURATION_MS));
    return () => window.clearTimeout(timer);
  }, []);

  // First login guide / onboarding trigger
  useEffect(() => {
    const pending = window.sessionStorage.getItem(FIRST_LOGIN_GUIDE_PENDING_KEY) === "1";
    if (!pending) {
      const raw = window.localStorage.getItem("nexa:onboarding:state:v1");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { dismissed?: boolean };
          if (!parsed.dismissed) setShowOnboarding(true);
        } catch { /* ignore */ }
      }
      return;
    }
    window.sessionStorage.removeItem(FIRST_LOGIN_GUIDE_PENDING_KEY);
    const alreadyShown = window.localStorage.getItem(FIRST_LOGIN_GUIDE_SHOWN_KEY) === "1";
    if (!alreadyShown) {
      window.localStorage.setItem(FIRST_LOGIN_GUIDE_SHOWN_KEY, "1");
      setShowOnboarding(true);
    }
    setShowFirstLoginGuide(false);
  }, []);

  // Section intro trigger on navigation
  useEffect(() => {
    if (isTrialBlocking) return;
    if (!location.pathname.startsWith("/admin")) return;
    if (lastIntroPathRef.current === location.pathname) return;

    const intro = getSectionIntro(location.pathname);
    if (!intro) { lastIntroPathRef.current = location.pathname; return; }

    const pendingFirstLogin = window.sessionStorage.getItem(FIRST_LOGIN_GUIDE_PENDING_KEY) === "1";
    if (pendingFirstLogin || showWelcomeOverlay || showFirstLoginGuide) return;

    const seen = readSeenIntros();
    lastIntroPathRef.current = location.pathname;
    if (seen.has(intro.key)) return;

    seen.add(intro.key);
    persistSeenIntros(seen);
    setActiveSectionIntro(intro);
  }, [isTrialBlocking, location.pathname, showFirstLoginGuide, showWelcomeOverlay]);

  // Auto-dismiss section intro
  useEffect(() => {
    if (!activeSectionIntro) return;
    const timer = window.setTimeout(() => setActiveSectionIntro(null), SECTION_INTRO_MODAL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeSectionIntro]);

  // Reset quick help hint on navigation
  useEffect(() => {
    setShowQuickHelpHint(false);
    if (quickHelpHideTimerRef.current) {
      window.clearTimeout(quickHelpHideTimerRef.current);
      quickHelpHideTimerRef.current = null;
    }
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (quickHelpHideTimerRef.current) window.clearTimeout(quickHelpHideTimerRef.current);
    };
  }, []);

  const revealQuickHelpHint = useCallback(() => {
    if (!sectionIntroForPath) return;
    setShowQuickHelpHint(true);
    if (quickHelpHideTimerRef.current) window.clearTimeout(quickHelpHideTimerRef.current);
  }, [sectionIntroForPath]);

  const hideQuickHelpHint = useCallback(() => {
    quickHelpHideTimerRef.current = window.setTimeout(
      () => setShowQuickHelpHint(false),
      QUICK_HELP_HINT_AUTOHIDE_MS
    );
  }, []);

  const openContextualHelp = useCallback(() => {
    if (isTrialBlocking) return;
    if (sectionIntroForPath) {
      setActiveSectionIntro(sectionIntroForPath);
      return;
    }
    try {
      const raw = window.localStorage.getItem("nexa:onboarding:state:v1");
      if (raw) {
        const parsed = JSON.parse(raw) as { dismissed?: boolean };
        parsed.dismissed = false;
        window.localStorage.setItem("nexa:onboarding:state:v1", JSON.stringify(parsed));
      }
    } catch { /* ignore */ }
    setShowOnboarding(true);
  }, [isTrialBlocking, sectionIntroForPath]);

  const schoolSlug = authContext?.memberships[0]?.tenantSlug;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isTrialBlocking) return null;

  return (
    <>
      {/* Welcome overlay */}
      {showWelcomeOverlay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 pointer-events-none">
          <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-medium">
            <p className="text-base font-semibold text-foreground">Bienvenido a Nexa</p>
            <p className="mt-1 text-sm text-muted-foreground">Preparando tus datos...</p>
          </div>
        </div>
      )}

      {/* Section intro overlay */}
      {activeSectionIntro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[35] flex items-center justify-center bg-background/75 px-4 pointer-events-auto"
          onClick={() => setActiveSectionIntro(null)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-semibold text-foreground">{activeSectionIntro.title}</p>
              <button
                type="button"
                onClick={() => setActiveSectionIntro(null)}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{activeSectionIntro.summary}</p>
          </div>
        </motion.div>
      )}

      {/* Help button + quick hint (floating, bottom-right) */}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[80] flex items-end gap-2 md:bottom-24 md:right-6">
        <AnimatePresence>
          {sectionIntroForPath && showQuickHelpHint && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none hidden max-w-xs rounded-lg border border-border bg-card/95 px-3 py-2 text-left shadow-medium lg:block"
            >
              <p className="text-xs font-semibold text-foreground">Guía rápida: {sectionIntroForPath.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{sectionIntroForPath.summary}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="pointer-events-auto h-12 w-12 rounded-full shadow-medium"
              aria-label={sectionIntroForPath ? `Ver ayuda de ${sectionIntroForPath.title}` : "Retomar configuración guiada"}
              onClick={openContextualHelp}
              onMouseEnter={revealQuickHelpHint}
              onFocus={revealQuickHelpHint}
              onMouseLeave={hideQuickHelpHint}
              onBlur={hideQuickHelpHint}
            >
              <CircleHelp className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {sectionIntroForPath ? "Ver ayuda de esta sección" : "Retomar configuración guiada"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Onboarding panel (fixed right side) */}
      {showOnboarding && (
        <OnboardingPanel
          onDismiss={() => setShowOnboarding(false)}
          schoolSlug={schoolSlug}
        />
      )}
    </>
  );
}
