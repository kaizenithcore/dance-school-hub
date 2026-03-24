import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Settings, Award, CalendarDays, ChevronRight, LogOut, Users, Eye, EyeOff, Zap, Image, BookOpen, PencilLine, Search, ArrowLeftRight, Wallet } from "lucide-react";
import { toast } from "sonner";
import { CURRENT_STUDENT, MOCK_ACHIEVEMENTS, MOCK_CERTIFICATIONS, MOCK_PORTAL_EVENTS } from "../data/mockData";
import { ProfileHeader } from "../components/ProfileHeader";
import { AchievementBadge } from "../components/AchievementBadge";
import { usePortalPersona } from "../services/portalPersona";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getOwnPortalProfile,
  listSavedPortalItems,
  updateOwnPortalProfile,
  type PortalProfile,
} from "@/lib/api/portalFoundation";

export default function ProfileScreen() {
  const { persona } = usePortalPersona();
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const isPublic = profile?.publicProfile ?? (CURRENT_STUDENT.isPublicProfile ?? true);

  useEffect(() => {
    if (persona === "prospect") {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [ownProfile, saved] = await Promise.all([
          getOwnPortalProfile(),
          listSavedPortalItems({ limit: 1, offset: 0 }),
        ]);

        if (cancelled) return;
        setProfile(ownProfile);
        setSavedCount(saved.total);
      } catch {
        if (!cancelled) {
          setProfile(null);
          setSavedCount(0);
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
        <h1 className="text-xl font-bold text-foreground">Perfil</h1>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Perfil de bailarín en construcción</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Completa estilos, nivel y disponibilidad para recibir propuestas de escuelas.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <StatBox value="40%" label="Completado" />
            <StatBox value="0" label="Escuelas" />
          </div>
        </div>
      </div>
    );
  }

  const earnedAchievements = MOCK_ACHIEVEMENTS.filter((a) => a.earned);
  const passedCerts = MOCK_CERTIFICATIONS.filter((c) => c.status === "passed");
  const xp = profile?.xp ?? (CURRENT_STUDENT.xp ?? 0);
  const xpNext = 3000;
  const xpPercent = Math.round((xp / xpNext) * 100);
  const mappedStudent = useMemo(
    () => ({
      ...CURRENT_STUDENT,
      name: profile?.displayName ?? CURRENT_STUDENT.name,
      avatar: profile?.avatarUrl ?? CURRENT_STUDENT.avatar,
      styles: profile?.styles?.length ? profile.styles : CURRENT_STUDENT.styles,
      level: profile?.level ?? CURRENT_STUDENT.level,
      yearsExperience: profile?.yearsExperience ?? CURRENT_STUDENT.yearsExperience,
      followersCount: profile?.followersCount ?? CURRENT_STUDENT.followersCount,
      followingCount: profile?.followingCount ?? CURRENT_STUDENT.followingCount,
      isPublicProfile: profile?.publicProfile ?? CURRENT_STUDENT.isPublicProfile,
      xp,
      xpToNextLevel: xpNext,
      currentStreak: profile?.streakCount ?? CURRENT_STUDENT.currentStreak,
    }),
    [profile, xp]
  );

  const togglePublicProfile = () => {
    if (!profile) {
      return;
    }

    const nextPublicValue = !profile.publicProfile;
    const optimistic = { ...profile, publicProfile: nextPublicValue };
    setProfile(optimistic);

    void updateOwnPortalProfile({
      displayName: profile.displayName,
      stageName: profile.stageName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      city: profile.city,
      styles: profile.styles,
      level: profile.level,
      yearsExperience: profile.yearsExperience,
      publicProfile: nextPublicValue,
    }).catch(() => {
      setProfile(profile);
    });
  };

  const shareProfileLink = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const shareUrl = `${window.location.origin}/portal/app/profile`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Enlace de perfil copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <div className="px-4 pb-24 pt-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <ProfileHeader student={mappedStudent} large />
      </motion.div>

      {/* Followers / Following */}
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{mappedStudent.followersCount ?? 0}</p>
          <p className="text-[11px] text-muted-foreground">Seguidores</p>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{mappedStudent.followingCount ?? 0}</p>
          <p className="text-[11px] text-muted-foreground">Siguiendo</p>
        </div>
      </div>

      {/* Public/private toggle */}
      <button
        onClick={togglePublicProfile}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition",
          isPublic
            ? "border-primary/30 bg-primary/5 text-foreground"
            : "border-border bg-card text-foreground"
        )}
      >
        {isPublic ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
        Perfil {isPublic ? "público" : "privado"}
        <span className="ml-auto text-xs text-muted-foreground">
          {isPublic ? "Visible para otros" : "Solo tú"}
        </span>
      </button>

      <button
        onClick={() => void shareProfileLink()}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        <Users className="h-4 w-4 text-muted-foreground" /> Compartir perfil
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBox value={String(mappedStudent.classesCompleted)} label="Clases" />
        <StatBox value={String(earnedAchievements.length)} label="Logros" />
        <StatBox value={persona === "community" ? "Comunidad" : `${mappedStudent.yearsExperience} años`} label={persona === "community" ? "Modo" : "Experiencia"} />
      </div>

      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        Guardados sincronizados: {savedCount}
      </div>

      {/* XP & Level */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Nivel {mappedStudent.level}</span>
          </div>
          <span className="text-xs text-muted-foreground">{xp} / {xpNext} XP</span>
        </div>
        <Progress value={xpPercent} className="h-2" />
        <p className="text-[11px] text-muted-foreground">
          Completa clases y misiones para subir de nivel
        </p>
      </div>

      {persona === "community" ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
          Tienes habilitado el módulo social. Tu perfil también muestra publicaciones, comentarios y eventos colaborativos.
        </div>
      ) : null}

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
        <Link
          to="/portal/app/notifications"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Settings className="h-4 w-4 text-muted-foreground" /> Notificaciones
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/app/connections"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Users className="h-4 w-4 text-muted-foreground" /> Comunidad
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/app/saved"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Award className="h-4 w-4 text-muted-foreground" /> Guardados
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/app/gallery"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Image className="h-4 w-4 text-muted-foreground" /> Galería
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/explorer"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Search className="h-4 w-4 text-muted-foreground" /> Explorar escuelas
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/app/search"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Search className="h-4 w-4 text-muted-foreground" /> Busqueda global
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/app/schools/compare"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" /> Comparar escuelas
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/app/finance"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Wallet className="h-4 w-4 text-muted-foreground" /> Finanzas y exportaciones
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/app/teacher/schedule"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <CalendarDays className="h-4 w-4 text-muted-foreground" /> Profesor · Horario
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/app/teacher/classes"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <BookOpen className="h-4 w-4 text-muted-foreground" /> Profesor · Clases
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/portal/app/teacher/posts/new"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <PencilLine className="h-4 w-4 text-muted-foreground" /> Profesor · Publicar
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/portal/app/preferences" className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted">
          <Settings className="h-4 w-4 text-muted-foreground" /> Ajustes
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
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
