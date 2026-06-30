/**
 * OnboardingShell — manages the guided setup wizard and contextual help panel.
 *
 * Responsibilities:
 *   - Show OnboardingWizard on first login (full-screen guided setup)
 *   - Welcome overlay for 2s on first login
 *   - Floating ? button (bottom-right) that opens ContextualHelpPanel
 *   - ContextualHelpPanel: per-page help with tips and quick actions
 */
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { ContextualHelpPanel } from "@/components/onboarding/ContextualHelpPanel";
import { useBillingShellState } from "@/components/layout/BillingContext";
import { useAuth } from "@/contexts/AuthContext";

// ── Storage keys ───────────────────────────────────────────────────────────────
const LOGIN_WELCOME_KEY = "nexa:welcome-overlay-until";
const WIZARD_STATE_KEY  = "nexa:onboarding:v2";
// Set when the user explicitly dismisses the wizard ("Cerrar y continuar después").
// Session-scoped (not localStorage) so it doesn't suppress the wizard forever,
// only for the rest of the current browser session — re-opening it manually
// from the help panel still works at any time.
const WIZARD_DISMISSED_SESSION_KEY = "nexa:onboarding:dismissed-session";

function isWizardFinished(): boolean {
  try {
    const raw = localStorage.getItem(WIZARD_STATE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { finished?: boolean };
    return parsed.finished === true;
  } catch { return false; }
}

function shouldAutoOpenWizard(): boolean {
  if (window.sessionStorage.getItem(WIZARD_DISMISSED_SESSION_KEY) === "1") return false;
  try {
    const raw = localStorage.getItem(WIZARD_STATE_KEY);
    if (!raw) return true; // Never started — show wizard
    const parsed = JSON.parse(raw) as { finished?: boolean; step?: number };
    return !parsed.finished; // Show if not finished
  } catch { return true; }
}

// ── Component ──────────────────────────────────────────────────────────────────
export function OnboardingShell() {
  const location = useLocation();
  const { authContext } = useAuth();
  const { showTrialLockModal, showTrialLoadingModal } = useBillingShellState();
  const isTrialBlocking = showTrialLockModal || showTrialLoadingModal;

  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [wizardFinished, setWizardFinished] = useState(() => isWizardFinished());

  const schoolSlug = authContext?.memberships[0]?.tenantSlug;

  // Welcome overlay (2 seconds after login)
  useEffect(() => {
    const raw = window.sessionStorage.getItem(LOGIN_WELCOME_KEY);
    if (!raw) return;
    const until = Number(raw);
    window.sessionStorage.removeItem(LOGIN_WELCOME_KEY);
    if (!Number.isFinite(until)) return;
    const remaining = Math.max(0, until - Date.now());
    if (remaining === 0) return;
    setShowWelcomeOverlay(true);
    const t = window.setTimeout(() => {
      setShowWelcomeOverlay(false);
      // Auto-open wizard after welcome overlay if not finished
      if (!isTrialBlocking && shouldAutoOpenWizard()) {
        setShowWizard(true);
      }
    }, Math.min(remaining, 2000));
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On initial mount (direct navigation, no welcome overlay), auto-open wizard
  useEffect(() => {
    if (isTrialBlocking) return;
    const hasWelcome = !!window.sessionStorage.getItem(LOGIN_WELCOME_KEY);
    if (hasWelcome) return; // Welcome overlay will handle it
    if (shouldAutoOpenWizard()) {
      // Small delay so the layout settles first
      const t = window.setTimeout(() => setShowWizard(true), 600);
      return () => window.clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close help panel on navigation
  useEffect(() => {
    setShowHelpPanel(false);
  }, [location.pathname]);

  const handleOpenHelp = useCallback(() => {
    if (isTrialBlocking) return;
    setShowHelpPanel((p) => !p);
  }, [isTrialBlocking]);

  const handleWizardClose = useCallback(() => {
    setShowWizard(false);
    const finished = isWizardFinished();
    setWizardFinished(finished);
    if (!finished) {
      // Dismissed without finishing — don't auto-reopen for the rest of this
      // session. The user can still resume it anytime via the help panel.
      window.sessionStorage.setItem(WIZARD_DISMISSED_SESSION_KEY, "1");
    }
  }, []);

  const handleOpenWizard = useCallback(() => {
    setShowWizard(true);
    setShowHelpPanel(false);
  }, []);

  if (isTrialBlocking) return null;

  return (
    <>
      {/* Welcome overlay */}
      <AnimatePresence>
        {showWelcomeOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 pointer-events-none"
          >
            <div className="rounded-xl border border-border bg-card px-8 py-6 shadow-xl text-center space-y-1">
              <p className="text-base font-semibold text-foreground">Bienvenido a Nexa</p>
              <p className="text-sm text-muted-foreground">Preparando tu panel…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding wizard (full-screen dialog) */}
      <OnboardingWizard
        open={showWizard}
        onClose={handleWizardClose}
        schoolSlug={schoolSlug}
      />

      {/* Contextual help panel (slide-in from right) */}
      <ContextualHelpPanel
        open={showHelpPanel}
        onClose={() => setShowHelpPanel(false)}
        pathname={location.pathname}
        onOpenWizard={handleOpenWizard}
        wizardFinished={wizardFinished}
      />

      {/* Floating help button (bottom-right) */}
      <div className="fixed bottom-6 right-4 z-[55] md:bottom-8 md:right-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              onClick={handleOpenHelp}
              className="h-12 w-12 rounded-full shadow-lg"
              aria-label="Abrir panel de ayuda"
            >
              <CircleHelp className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {showHelpPanel ? "Cerrar ayuda" : "Ayuda de esta sección"}
          </TooltipContent>
        </Tooltip>

        {/* Badge: pulse when wizard is not finished */}
        {!wizardFinished && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        )}
      </div>
    </>
  );
}
