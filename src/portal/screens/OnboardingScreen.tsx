/**
 * OnboardingScreen V1 — simplified 3-step profile setup.
 *
 * Removed for V1:
 *   - Step 4: City + bio + public profile toggle (not needed for operational access)
 *   - Step 5: School discovery / follow (community feature, not operational)
 *
 * The student is already linked to a school via the invitation code.
 * Onboarding just captures display name, styles, and level.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Music, Award, Loader2 } from "lucide-react";
import { updateOwnPortalProfile } from "@/lib/api/portalFoundation";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const LEVELS = ["Principiante", "Intermedio", "Avanzado"];
const STYLE_OPTIONS = ["Ballet", "Contemporáneo", "Jazz", "Hip Hop", "Salsa", "Flamenco"];
const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [level, setLevel] = useState("Intermedio");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => {
    if (step === 1) return displayName.trim().length > 1;
    if (step === 2) return styles.length > 0;
    return true; // step 3 always ok (default level pre-selected)
  }, [displayName, level, step, styles.length]);

  const toggleStyle = (style: string) =>
    setStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));

  const handleComplete = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      await updateOwnPortalProfile({
        displayName: displayName.trim(),
        styles,
        level,
        city: null,
        bio: null,
        publicProfile: false,
      });

      trackPortalEvent({
        eventName: "onboarding_completed",
        category: "funnel",
        metadata: { stylesCount: styles.length, level },
      });

      navigate("/portal/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-14">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Music className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Bienvenido al portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Solo 3 pasos para empezar</p>

        {/* Progress */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 <= step ? "bg-primary w-8" : "bg-muted w-4"
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Step 1: Display name */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-1 flex-col gap-4"
        >
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Paso 1 de {TOTAL_STEPS} — ¿Cómo te llamamos?</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Este nombre aparecerá en tu perfil del portal.
            </p>
            <input
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canContinue && setStep(2)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Tu nombre o apodo"
            />
          </div>
        </motion.div>
      )}

      {/* Step 2: Dance styles */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-1 flex-col gap-4"
        >
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Music className="h-4 w-4 text-primary" />
              <span>Paso 2 de {TOTAL_STEPS} — ¿Qué estilos practicas?</span>
            </div>
            <p className="text-sm text-muted-foreground">Selecciona los que quieras.</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((style) => {
                const selected = styles.includes(style);
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 3: Level */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-1 flex-col gap-4"
        >
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Award className="h-4 w-4 text-primary" />
              <span>Paso 3 de {TOTAL_STEPS} — ¿Cuál es tu nivel?</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`rounded-lg px-3 py-3 text-sm font-medium transition ${
                    level === lvl
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="mt-8 space-y-3">
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep((s) => s + 1)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continuar <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleComplete()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            ) : (
              <>Entrar al portal <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate("/portal/app", { replace: true })}
          className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          Omitir por ahora
        </button>
      </div>
    </div>
  );
}
