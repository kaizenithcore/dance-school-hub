import { useState } from "react";
import { motion } from "framer-motion";
import { CURRENT_STUDENT, MOCK_ACHIEVEMENTS } from "../data/mockData";
import { ProgressCard } from "../components/ProgressCard";
import { AchievementBadge } from "../components/AchievementBadge";
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
          <p className="text-sm font-medium text-foreground">Tu progreso se activara al matricularte</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aqui veras asistencia, nivel, hitos y certificaciones en cuanto tengas una escuela conectada.
          </p>
        </div>
      </div>
    );
  }

  const filtered = cat === "Todos"
    ? MOCK_ACHIEVEMENTS
    : MOCK_ACHIEVEMENTS.filter((a) => a.category === categoryMap[cat]);

  const earned = MOCK_ACHIEVEMENTS.filter((a) => a.earned).length;

  return (
    <div className="px-4 pb-24 pt-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Progreso</h1>

      <ProgressCard student={CURRENT_STUDENT} />

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
