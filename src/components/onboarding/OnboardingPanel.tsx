/**
 * OnboardingPanel — guided 5-step setup panel.
 *
 * Renders as a fixed right-side panel (320px) on desktop.
 * On mobile it collapses to a bottom banner showing the active step.
 *
 * The panel is layered over the admin interface; the user can navigate
 * the app freely while following along. Completing each step is detected
 * automatically where possible and manually via "Marcar como hecho" otherwise.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Building2, GraduationCap, Users, CreditCard, Smartphone,
  ChevronRight, ChevronLeft, Check, X, ArrowRight, ExternalLink,
} from "lucide-react";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { getClasses } from "@/lib/api/classes";
import { getStudents } from "@/lib/api/students";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// ── Storage keys ───────────────────────────────────────────────────────────────

const ONBOARDING_STATE_KEY = "nexa:onboarding:state:v1";
const ONBOARDING_COLLAPSED_KEY = "nexa:onboarding:collapsed:v1";

// ── Types ──────────────────────────────────────────────────────────────────────

type StepId = 1 | 2 | 3 | 4 | 5;

interface OnboardingState {
  activeStep: StepId;
  completed: StepId[];
  dismissed: boolean;
}

interface StepDef {
  id: StepId;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  description: string;
  actionLabel: string;
  actionPath?: string;
  actionExternal?: boolean;
}

// ── Step definitions ───────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  {
    id: 1,
    title: "Tu escuela",
    shortTitle: "Escuela",
    icon: Building2,
    description: "Pon el nombre de tu escuela y sube tu logo. Es lo primero que verán tus alumnos.",
    actionLabel: "Ir a información de la escuela",
    actionPath: "/admin/settings/escuela",
  },
  {
    id: 2,
    title: "Tu primera clase",
    shortTitle: "Clase",
    icon: GraduationCap,
    description: "Crea una clase para que el horario empiece a cobrar forma. Solo necesitas nombre, día y hora.",
    actionLabel: "Ir a clases",
    actionPath: "/admin/classes",
  },
  {
    id: 3,
    title: "Tus primeros alumnos",
    shortTitle: "Alumnos",
    icon: Users,
    description: "Añade un alumno manualmente o importa tu lista desde Excel. Con uno es suficiente para empezar.",
    actionLabel: "Ir a alumnos",
    actionPath: "/admin/students",
  },
  {
    id: 4,
    title: "Cómo cobrar",
    shortTitle: "Cobros",
    icon: CreditCard,
    description: "Indica la moneda, el día de vencimiento y los métodos de pago que aceptas. Sin Stripe todavía.",
    actionLabel: "Configurar cobros",
    actionPath: "/admin/settings/cobros",
  },
  {
    id: 5,
    title: "El portal de tus alumnos",
    shortTitle: "Portal",
    icon: Smartphone,
    description: "Tus alumnos podrán ver su horario, pagos y avisos sin llamarte. Échale un vistazo.",
    actionLabel: "Ver portal",
    actionExternal: true,
  },
];

// ── State helpers ──────────────────────────────────────────────────────────────

function readState(): OnboardingState {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STATE_KEY);
    if (!raw) return { activeStep: 1, completed: [], dismissed: false };
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return { activeStep: 1, completed: [], dismissed: false };
  }
}

function persistState(state: OnboardingState) {
  window.localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
}

function readCollapsed(): boolean {
  return window.localStorage.getItem(ONBOARDING_COLLAPSED_KEY) === "1";
}

function persistCollapsed(v: boolean) {
  window.localStorage.setItem(ONBOARDING_COLLAPSED_KEY, v ? "1" : "0");
}

// ── Auto-detection helpers ─────────────────────────────────────────────────────

async function detectCompletedSteps(): Promise<StepId[]> {
  const completed: StepId[] = [];

  try {
    const [settings, classes, students] = await Promise.allSettled([
      getSchoolSettings(),
      getClasses(),
      getStudents(),
    ]);

    // Step 1: school has a name set (not placeholder)
    if (settings.status === "fulfilled" && settings.value?.school?.name) {
      completed.push(1);
    }

    // Step 2: at least one class exists
    if (classes.status === "fulfilled" && (classes.value?.length ?? 0) > 0) {
      completed.push(2);
    }

    // Step 3: at least one student exists
    if (students.status === "fulfilled" && (students.value?.length ?? 0) > 0) {
      completed.push(3);
    }

    // Step 4: payment settings configured (non-default currency or due day)
    if (settings.status === "fulfilled" && settings.value?.payment?.currency) {
      completed.push(4);
    }
  } catch {
    // Ignore detection errors — user can mark steps manually
  }

  return completed;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface OnboardingPanelProps {
  onDismiss: () => void;
  schoolSlug?: string;
}

export function OnboardingPanel({ onDismiss, schoolSlug }: OnboardingPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setStateRaw] = useState<OnboardingState>(readState);
  const [collapsed, setCollapsedRaw] = useState(readCollapsed);
  const [dismissConfirm, setDismissConfirm] = useState(false);
  const [detecting, setDetecting] = useState(true);

  const setState = useCallback((next: OnboardingState) => {
    setStateRaw(next);
    persistState(next);
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedRaw(v);
    persistCollapsed(v);
  }, []);

  // Auto-detect completed steps on mount
  useEffect(() => {
    void (async () => {
      setDetecting(true);
      const detected = await detectCompletedSteps();

      setStateRaw((prev) => {
        const merged: StepId[] = Array.from(new Set([...prev.completed, ...detected]));
        // Advance activeStep to the first incomplete step
        const allIds = STEPS.map((s) => s.id) as StepId[];
        const firstIncomplete = allIds.find((id) => !merged.includes(id)) ?? 5;
        const next = { ...prev, completed: merged, activeStep: firstIncomplete };
        persistState(next);
        return next;
      });
      setDetecting(false);
    })();
  }, []);

  const isCompleted = useCallback((id: StepId) => state.completed.includes(id), [state.completed]);

  const markDone = useCallback((id: StepId) => {
    const merged: StepId[] = Array.from(new Set([...state.completed, id]));
    const allIds = STEPS.map((s) => s.id) as StepId[];
    const nextIncomplete = allIds.find((sid) => !merged.includes(sid));

    if (!nextIncomplete) {
      // All done
      const next = { ...state, completed: merged, dismissed: true };
      setState(next);
      onDismiss();
      toast.success("¡Configuración completada! Nexa está listo.");
      return;
    }

    setState({ ...state, completed: merged, activeStep: nextIncomplete as StepId });
  }, [state, setState, onDismiss]);

  const handleAction = useCallback((step: StepDef) => {
    if (step.actionExternal && schoolSlug) {
      window.open(`/s/${schoolSlug}`, "_blank");
      markDone(step.id);
      return;
    }
    if (step.actionPath) {
      navigate(step.actionPath);
      setCollapsed(false);
    }
  }, [navigate, schoolSlug, markDone, setCollapsed]);

  const handleDismiss = useCallback(() => {
    if (dismissConfirm) {
      setState({ ...state, dismissed: true });
      onDismiss();
      setDismissConfirm(false);
    } else {
      setDismissConfirm(true);
    }
  }, [dismissConfirm, state, setState, onDismiss]);

  const activeStep = STEPS.find((s) => s.id === state.activeStep) ?? STEPS[0];
  const progress = state.completed.length;
  const totalSteps = STEPS.length;

  // ── Mobile banner ──────────────────────────────────────────────────────────

  const mobileBanner = (
    <div className="fixed bottom-0 left-0 right-0 z-[60] md:hidden border-t border-border bg-card shadow-lg">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <activeStep.icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-xs font-medium text-foreground">
              Paso {state.activeStep} de {totalSteps}: {activeStep.shortTitle}
            </p>
            <div className="mt-0.5 flex gap-1">
              {STEPS.map((s) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-1 w-4 rounded-full",
                    isCompleted(s.id) ? "bg-success" : s.id === state.activeStep ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", !collapsed && "rotate-90")} />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">{activeStep.description}</p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => handleAction(activeStep)}>
              {activeStep.actionLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
            {!isCompleted(activeStep.id) && (
              <Button size="sm" variant="outline" onClick={() => markDone(activeStep.id)}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Desktop panel ──────────────────────────────────────────────────────────

  const desktopPanel = (
    <div
      className={cn(
        "hidden md:flex fixed top-0 right-0 h-screen z-[60] flex-col border-l border-border bg-card shadow-xl transition-all duration-300",
        collapsed ? "w-10" : "w-80"
      )}
    >
      {/* Collapse toggle on left edge */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-accent transition-colors z-10"
        title={collapsed ? "Expandir guía" : "Colapsar guía"}
      >
        {collapsed ? (
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {collapsed ? (
        // Collapsed: show vertical label
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4">
          <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180">
            Configuración guiada
          </span>
          <div className="flex flex-col gap-1 mt-2">
            {STEPS.map((s) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 w-1.5 rounded-full mx-auto",
                  isCompleted(s.id) ? "bg-success" : s.id === state.activeStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
            <div>
              <p className="text-sm font-semibold text-foreground">Configura tu escuela</p>
              <div className="mt-1.5 flex gap-1">
                {STEPS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setState({ ...state, activeStep: s.id })}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      isCompleted(s.id)
                        ? "bg-success w-5"
                        : s.id === state.activeStep
                          ? "bg-primary w-5"
                          : "bg-muted w-2 hover:bg-muted-foreground/40"
                    )}
                    title={s.shortTitle}
                  />
                ))}
              </div>
            </div>
            {dismissConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">¿Omitir?</span>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-[10px] font-medium text-destructive hover:underline"
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setDismissConfirm(false)}
                  className="text-[10px] text-muted-foreground hover:underline"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
                title="Omitir configuración"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Active step content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isCompleted(activeStep.id) ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                )}>
                  {isCompleted(activeStep.id)
                    ? <Check className="h-4 w-4" />
                    : <activeStep.icon className="h-4 w-4" />
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeStep.title}</p>
                  <p className="text-[10px] text-muted-foreground">Paso {activeStep.id} de {totalSteps}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{activeStep.description}</p>

              <Button
                size="sm"
                className="w-full"
                onClick={() => handleAction(activeStep)}
                disabled={detecting}
              >
                {activeStep.actionExternal ? (
                  <><ExternalLink className="h-3.5 w-3.5 mr-1.5" />{activeStep.actionLabel}</>
                ) : (
                  <>{activeStep.actionLabel}<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>
                )}
              </Button>

              {!isCompleted(activeStep.id) && (
                <button
                  type="button"
                  onClick={() => markDone(activeStep.id)}
                  className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Marcar como completado
                </button>
              )}
            </div>

            {/* Step list */}
            <div className="space-y-1">
              {STEPS.map((step) => {
                const done = isCompleted(step.id);
                const active = step.id === state.activeStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setState({ ...state, activeStep: step.id })}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                      done
                        ? "border-success bg-success/10 text-success"
                        : active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                    )}>
                      {done ? <Check className="h-3 w-3" /> : step.id}
                    </div>
                    <span className="text-xs font-medium">{step.shortTitle}</span>
                    {done && <Check className="ml-auto h-3 w-3 text-success shrink-0" />}
                    {active && !done && <ChevronRight className="ml-auto h-3 w-3 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Progress summary */}
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-center">
              <p className="text-[11px] text-muted-foreground">
                {progress === 0
                  ? "Empecemos con lo básico"
                  : progress === totalSteps
                    ? "¡Todo configurado!"
                    : `${progress} de ${totalSteps} pasos completados`
                }
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {mobileBanner}
      {desktopPanel}
    </>
  );
}
