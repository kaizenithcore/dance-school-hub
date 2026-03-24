import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Trophy, Award, Star } from "lucide-react";
import { followPortalSchool, listPublicPortalSchools, updateOwnPortalProfile } from "@/lib/api/portalFoundation";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const levels = ["Principiante", "Intermedio", "Avanzado"];
const styleOptions = ["Ballet", "Contemporaneo", "Jazz", "Hip Hop", "Salsa", "Flamenco"];

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [level, setLevel] = useState("Intermedio");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendedSchools, setRecommendedSchools] = useState<Array<{ tenantId: string; slug: string; name: string; location: string | null }>>([]);
  const [selectedRecommendedSchoolIds, setSelectedRecommendedSchoolIds] = useState<string[]>([]);

  const canContinue = useMemo(() => {
    if (step === 1) return displayName.trim().length > 1;
    if (step === 2) return styles.length > 0;
    if (step === 3) return level.length > 0;
    return true;
  }, [displayName, level, step, styles.length]);

  const toggleStyle = (style: string) => {
    setStyles((prev) => (prev.includes(style) ? prev.filter((item) => item !== style) : [...prev, style]));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      await updateOwnPortalProfile({
        displayName: displayName.trim(),
        styles,
        level,
        city: city.trim() || null,
        bio: bio.trim() || null,
        publicProfile,
      });

      const schools = await listPublicPortalSchools({ q: city.trim() || undefined, limit: 3, offset: 0 });
      const nextRecommended = schools.items.map((school) => ({
        tenantId: school.tenantId,
        slug: school.slug,
        name: school.name,
        location: school.location,
      }));
      setRecommendedSchools(nextRecommended);
      setSelectedRecommendedSchoolIds(nextRecommended.map((school) => school.tenantId));
      setStep(5);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar tu perfil");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecommendedSchool = (tenantId: string) => {
    setSelectedRecommendedSchoolIds((prev) =>
      prev.includes(tenantId) ? prev.filter((item) => item !== tenantId) : [...prev, tenantId]
    );
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      if (selectedRecommendedSchoolIds.length > 0) {
        await Promise.all(
          selectedRecommendedSchoolIds.map((tenantId) =>
            followPortalSchool(tenantId).catch(() => false)
          )
        );
      }

      trackPortalEvent({
        eventName: "onboarding_completed",
        category: "funnel",
        metadata: {
          selectedSchoolsCount: selectedRecommendedSchoolIds.length,
          stylesCount: styles.length,
          level,
          profilePublic: publicProfile,
        },
      });

      navigate("/portal/app");
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "No se pudo completar el onboarding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-16">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Dance<span className="text-primary">Hub</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Onboarding del Portal del Alumno</p>
      </motion.div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-1 flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="h-4 w-4 text-primary" /> Paso 1 de 4
            </div>
            <h3 className="font-semibold text-foreground">Como quieres aparecer en el portal</h3>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Nombre visible"
            />
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-1 flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Trophy className="h-4 w-4 text-primary" /> Paso 2 de 4
            </div>
            <h3 className="font-semibold text-foreground">Selecciona tus estilos</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {styleOptions.map((style) => {
                const selected = styles.includes(style);
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-1 flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Award className="h-4 w-4 text-primary" /> Paso 3 de 4
            </div>
            <h3 className="font-semibold text-foreground">Cuentanos tu nivel actual</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {levels.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLevel(item)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${level === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-1 flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Star className="h-4 w-4 text-primary" /> Paso 4 de 4
            </div>
            <h3 className="font-semibold text-foreground">Ultimos detalles</h3>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ciudad"
            />
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="mt-3 h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Bio breve"
            />
            <button
              type="button"
              onClick={() => setPublicProfile((value) => !value)}
              className="mt-3 w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground"
            >
              Perfil {publicProfile ? "publico" : "privado"}
            </button>
          </div>
        </motion.div>
      )}

      {step === 5 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground">Perfil completado</h3>
            <p className="mt-1 text-sm text-muted-foreground">Selecciona escuelas para seguir desde el inicio:</p>
            <div className="mt-3 space-y-2">
              {recommendedSchools.map((school) => (
                <button
                  key={school.tenantId}
                  type="button"
                  onClick={() => toggleRecommendedSchool(school.tenantId)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left ${
                    selectedRecommendedSchoolIds.includes(school.tenantId)
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{school.name}</p>
                  <p className="text-xs text-muted-foreground">{school.location ?? "Ubicacion no indicada"}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-8 flex flex-col gap-3">
        {step < 4 && (
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep((value) => value + 1)}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continuar <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 4 && (
          <button
            type="button"
            disabled={loading || !canContinue}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar perfil"}
          </button>
        )}

        {step === 5 && (
          <button
            type="button"
            disabled={loading}
            onClick={handleCompleteOnboarding}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Completando..." : "Seguir y entrar al portal"}
          </button>
        )}

        <Link to="/portal/app" className="flex items-center justify-center rounded-xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground transition hover:bg-muted">
          Ir al portal
        </Link>
      </div>
    </div>
  );
}
