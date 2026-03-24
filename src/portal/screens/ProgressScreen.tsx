import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Target, CheckCircle2 } from "lucide-react";
import { CURRENT_STUDENT, MOCK_ACHIEVEMENTS, MOCK_MISSIONS } from "../data/mockData";
import { ProgressCard } from "../components/ProgressCard";
import { AchievementBadge } from "../components/AchievementBadge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePortalPersona } from "../services/portalPersona";

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
    ? MOCK_ACHIEVEMENTS
    : MOCK_ACHIEVEMENTS.filter((a) => a.category === categoryMap[cat]);

  const earned = MOCK_ACHIEVEMENTS.filter((a) => a.earned).length;
  const xp = CURRENT_STUDENT.xp ?? 0;
  const xpNext = CURRENT_STUDENT.xpToNextLevel ?? 3000;
  const activeMissions = MOCK_MISSIONS.filter((m) => !m.completed);
  const completedMissions = MOCK_MISSIONS.filter((m) => m.completed);

  return (
    <div className="px-4 pb-24 pt-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Progreso</h1>

      <ProgressCard student={CURRENT_STUDENT} />

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
          <span className="text-xs text-muted-foreground">{earned}/{MOCK_ACHIEVEMENTS.length} desbloqueados</span>
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
    </div>
  );
}

function MissionCard({ mission }: { mission: typeof MOCK_MISSIONS[number] }) {
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
