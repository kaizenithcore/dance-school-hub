import { Flame, BookOpen, TrendingUp, Award } from "lucide-react";
import type { PortalStudent } from "../data/mockData";

interface Props {
  student: PortalStudent;
}

export function ProgressCard({ student }: Props) {
  const nextLevel = student.classesCompleted >= 100 ? "Avanzado" : "Intermedio";
  const progressPct = Math.min((student.classesCompleted % 100) / 100 * 100, 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Tu progreso</h3>
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<BookOpen className="h-4 w-4 text-primary" />} value={String(student.classesCompleted)} label="Clases" />
        <Stat icon={<Flame className="h-4 w-4 text-warning" />} value={`${student.currentStreak} días`} label="Racha" />
        <Stat icon={<TrendingUp className="h-4 w-4 text-success" />} value={student.level} label="Nivel" />
        <Stat icon={<Award className="h-4 w-4 text-info" />} value={`${student.yearsExperience} años`} label="Experiencia" />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progreso hacia {nextLevel}</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
      {icon}
      <div>
        <p className="text-sm font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
