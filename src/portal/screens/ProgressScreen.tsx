import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Target, CheckCircle2 } from "lucide-react";
import type { PortalAchievement, PortalStudent } from "../data/mockData";
import { ProgressCard } from "../components/ProgressCard";
import { AchievementBadge } from "../components/AchievementBadge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePortalPersona } from "../services/portalPersona";
import { getStudentPortalProgress, getStudentPortalXpHistory } from "@/lib/api/studentPortal";

const categories = ["Todos", "Asistencia", "Eventos", "Hitos", "Certificaciones"] as const;
const categoryMap: Record<string, string> = {
  Todos: "all",
  Asistencia: "attendance",
  Eventos: "events",
  Hitos: "milestones",
  Certificaciones: "certifications",
};

export default function ProgressScreen() {
  const { persona } = usePortalPersona();
  const [cat, setCat] = useState("Todos");
  const [student, setStudent] = useState<PortalStudent>({
    id: "",
    name: "Alumno",
    avatar: "",
    school: "",
    styles: [],
    yearsExperience: 0,
    level: "Nivel 1",
    classesCompleted: 0,
    currentStreak: 0,
    joinDate: new Date().toISOString().slice(0, 10),
    xp: 0,
    xpToNextLevel: 1000,
  });
  const [achievements, setAchievements] = useState<PortalAchievement[]>([]);
  const [missions, setMissions] = useState<MissionUi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (persona === "prospect") {
      return;
    }

    let cancelled = false;

    const iconForCategory = (category: PortalAchievement["category"]): string => {
      if (category === "attendance") return "🔥";
      if (category === "events") return "🎪";
      if (category === "certifications") return "📜";
      return "⭐";
    };

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [progress, xpHistory] = await Promise.all([
          getStudentPortalProgress(),
          getStudentPortalXpHistory(20, 0),
        ]);

        if (cancelled) return;

        setStudent((prev) => ({
          ...prev,
          classesCompleted: progress.classesCompleted,
          currentStreak: progress.currentStreakDays,
          level: `Nivel ${progress.levelNumber}`,
          xp: progress.xp,
          xpToNextLevel: progress.xpToNextLevel,
        }));

        setAchievements(
          progress.achievements.map((achievement) => ({
            id: achievement.id,
            name: achievement.title,
            description: achievement.earned ? "Completado" : "En progreso",
            icon: iconForCategory(achievement.category),
            earned: achievement.earned,
            category: achievement.category,
          }))
        );

        const classCount = xpHistory.items.filter((item) => item.type === "class_completed").length;
        const eventCount = xpHistory.items.filter((item) => item.type === "event_attended").length;

        setMissions([
          {
            id: "weekly-classes",
            title: "Completar 3 clases",
            description: "Sigue sumando asistencia esta semana",
            icon: "📚",
            progress: Math.min(classCount, 3),
            target: 3,
            xpReward: 50,
            completed: classCount >= 3,
          },
          {
            id: "event-mission",
            title: "Asistir a 1 evento",
            description: "Participa en eventos de tu escuela",
            icon: "🎭",
            progress: Math.min(eventCount, 1),
            target: 1,
            xpReward: 80,
            completed: eventCount >= 1,
          },
          {
            id: "attendance-rate",
            title: "Mantener 90% de asistencia",
            description: "Cuidar la regularidad mejora tu nivel",
            icon: "🎯",
            progress: Math.min(progress.attendanceRate, 90),
            target: 90,
            xpReward: 120,
            completed: progress.attendanceRate >= 90,
          },
        ]);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar tu progreso");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [persona]);

  if (persona === "prospect") {
    return (
      <div className="px-4 pb-24 pt-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Progreso</h1>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Tu progreso se activará al matricularte</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aquí verás asistencia, nivel, hitos y certificaciones en cuanto tengas una escuela conectada.
          </p>
        </div>
      </div>
    );
  }

  const filtered = cat === "Todos"
    ? achievements
    : achievements.filter((a) => a.category === categoryMap[cat]);

  const earned = achievements.filter((a) => a.earned).length;
  const xp = student.xp ?? 0;
  const xpNext = student.xpToNextLevel ?? 1000;
  const activeMissions = useMemo(() => missions.filter((m) => !m.completed), [missions]);
  const completedMissions = useMemo(() => missions.filter((m) => m.completed), [missions]);

  return (
    <div className="px-4 pb-24 pt-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Progreso</h1>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Cargando progreso...</div>
      ) : null}

      {!isLoading ? (
        <>

      <ProgressCard student={student} />

      {/* XP bar */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{xp} XP</span>
          </div>
          <span className="text-xs text-muted-foreground">Siguiente nivel: {xpNext} XP</span>
        </div>
        <Progress value={Math.round((xp / xpNext) * 100)} className="h-2.5" />
        <p className="text-[11px] text-muted-foreground">Tu progreso habla por ti</p>
      </div>

      {/* Missions */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Misiones activas</h2>
        </div>
        <div className="space-y-2">
          {activeMissions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
          {completedMissions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Logros</h2>
          <span className="text-xs text-muted-foreground">{earned}/{achievements.length} desbloqueados</span>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
                cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <motion.div
          key={cat}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-4 gap-4"
        >
          {filtered.map((a) => (
            <AchievementBadge key={a.id} achievement={a} size="sm" />
          ))}
        </motion.div>
      </div>
        </>
      ) : null}
    </div>
  );
}

interface MissionUi {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  xpReward: number;
  completed: boolean;
}

function MissionCard({ mission }: { mission: MissionUi }) {
  const pct = Math.round((mission.progress / mission.target) * 100);
  return (
    <div className={cn(
      "rounded-xl border bg-card p-3 space-y-2 transition",
      mission.completed ? "border-primary/30 bg-primary/5" : "border-border"
    )}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{mission.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn("text-sm font-medium", mission.completed ? "text-primary" : "text-foreground")}>
              {mission.title}
            </p>
            {mission.completed && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
          </div>
          <p className="text-[11px] text-muted-foreground">{mission.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          +{mission.xpReward} XP
        </span>
      </div>
      {!mission.completed && (
        <div className="space-y-1">
          <Progress value={pct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground text-right">{mission.progress}/{mission.target}</p>
        </div>
      )}
    </div>
  );
}
