import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Settings, Award, CalendarDays, ChevronRight, LogOut } from "lucide-react";
import { CURRENT_STUDENT, MOCK_ACHIEVEMENTS, MOCK_CERTIFICATIONS, MOCK_PORTAL_EVENTS } from "../data/mockData";
import { ProfileHeader } from "../components/ProfileHeader";
import { AchievementBadge } from "../components/AchievementBadge";

export default function ProfileScreen() {
  const earnedAchievements = MOCK_ACHIEVEMENTS.filter((a) => a.earned);
  const passedCerts = MOCK_CERTIFICATIONS.filter((c) => c.status === "passed");

  return (
    <div className="px-4 pb-24 pt-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <ProfileHeader student={CURRENT_STUDENT} large />
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBox value={String(CURRENT_STUDENT.classesCompleted)} label="Clases" />
        <StatBox value={String(earnedAchievements.length)} label="Logros" />
        <StatBox value={`${CURRENT_STUDENT.yearsExperience} años`} label="Experiencia" />
      </div>

      {/* Achievements preview */}
      <Section title="Logros" linkTo="/portal/app/progress">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {earnedAchievements.slice(0, 5).map((a) => (
            <AchievementBadge key={a.id} achievement={a} size="sm" />
          ))}
        </div>
      </Section>

      {/* Certifications */}
      <Section title="Certificaciones">
        <div className="space-y-2">
          {passedCerts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
              <Award className="h-4 w-4 text-success" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{c.examName}</p>
                <p className="text-[11px] text-muted-foreground">{c.discipline} · Nota {c.grade}/10</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Events participated */}
      <Section title="Eventos">
        <div className="space-y-2">
          {MOCK_PORTAL_EVENTS.slice(0, 2).map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{e.name}</p>
                <p className="text-[11px] text-muted-foreground">{e.school}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted">
          <Settings className="h-4 w-4 text-muted-foreground" /> Ajustes
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </button>
        <Link
          to="/portal/onboarding"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-destructive transition hover:bg-muted"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Link>
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card py-3">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({ title, linkTo, children }: { title: string; linkTo?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="flex items-center gap-0.5 text-xs font-medium text-primary">
            Ver todo <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
