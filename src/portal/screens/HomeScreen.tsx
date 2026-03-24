import { motion } from "framer-motion";
import { ChevronRight, Heart, School } from "lucide-react";
import { Link } from "react-router-dom";
import { CURRENT_STUDENT, MOCK_PORTAL_CLASSES, MOCK_PORTAL_EVENTS, MOCK_ACHIEVEMENTS, MOCK_ACTIVITY, MOCK_FEED_POSTS } from "../data/mockData";
import { PortalClassCard } from "../components/PortalClassCard";
import { EventCard } from "../components/EventCard";
import { AchievementBadge } from "../components/AchievementBadge";
import { usePortalPersona } from "../services/portalPersona";

export default function HomeScreen() {
  const { persona } = usePortalPersona();
  const todayClasses = MOCK_PORTAL_CLASSES.filter((c) => c.day === "Lunes").slice(0, 2);
  const recentAchievements = MOCK_ACHIEVEMENTS.filter((a) => a.earned).slice(-3);
  const nextEvent = MOCK_PORTAL_EVENTS[0];
  const featuredPosts = MOCK_FEED_POSTS.slice(0, 2);

  if (persona === "prospect") {
    return (
      <div className="space-y-6 px-4 pb-24 pt-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-muted-foreground">Hola, 👋</p>
          <h1 className="text-2xl font-bold text-foreground">Bailarín</h1>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-2">
          <QuickStat value="0" label="Escuelas" emoji="🏫" />
          <QuickStat value="40%" label="Perfil" emoji="🧩" />
          <QuickStat value="1" label="Solicitud" emoji="📨" />
        </motion.div>

        <Section title="Siguiente paso">
          <div className="space-y-2">
            <CardLine title="Completa tu perfil" detail="Añade estilos, nivel y objetivos para mejorar el matching." />
            <CardLine title="Explora escuelas" detail="3 centros cercanos tienen matrícula abierta este mes." />
            <CardLine title="Sigue tu solicitud" detail="Dance North Academy está revisando tu acceso." />
          </div>
        </Section>

        <Section title="Acciones recomendadas">
          <div className="space-y-2">
            <ActionButton to="/portal" label="Buscar escuelas" />
            <ActionButton to="/portal/onboarding" label="Completar perfil" />
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-24 pt-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">Hola, 👋</p>
        <h1 className="text-2xl font-bold text-foreground">{CURRENT_STUDENT.name.split(" ")[0]}</h1>
      </motion.div>

      {/* Quick stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-2">
        <QuickStat value={String(CURRENT_STUDENT.classesCompleted)} label="Clases" emoji="📚" />
        <QuickStat value={`${CURRENT_STUDENT.currentStreak}d`} label="Racha" emoji="🔥" />
        <QuickStat value={CURRENT_STUDENT.level} label="Nivel" emoji="⭐" />
      </motion.div>

      {/* Today classes */}
      <Section title="Hoy" linkTo="/portal/app/classes">
        {todayClasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes clases hoy.</p>
        ) : (
          <div className="space-y-2">
            {todayClasses.map((c) => (
              <PortalClassCard key={c.id} cls={c} compact />
            ))}
          </div>
        )}
      </Section>

      {/* Feed highlight */}
      <Section title="Novedades de tu escuela" linkTo="/portal/app/feed">
        <div className="space-y-3">
          {featuredPosts.map((post) => (
            <div key={post.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {post.imageUrl && (
                <img src={post.imageUrl} alt="" className="h-32 w-full object-cover" loading="lazy" />
              )}
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <School className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{post.authorName}</span>
                </div>
                <p className="text-sm text-foreground line-clamp-2">{post.text}</p>
                <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3" /> {post.likes}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Activity feed */}
      <Section title="Actividad reciente">
        <div className="space-y-2">
          {MOCK_ACTIVITY.slice(0, persona === "community" ? 5 : 4).map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-lg">{a.icon}</span>
              <div>
                <p className="text-sm text-foreground">{a.text}</p>
                <p className="text-[11px] text-muted-foreground">{a.timestamp}</p>
              </div>
            </div>
          ))}
          {persona === "community" ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
              Tu escuela tiene comunidad activa: ahora puedes publicar avances y participar en eventos colaborativos.
            </div>
          ) : null}
        </div>
      </Section>

      {/* Achievements */}
      <Section title="Logros recientes" linkTo="/portal/app/progress">
        <div className="flex gap-4 overflow-x-auto pb-1">
          {recentAchievements.map((a) => (
            <AchievementBadge key={a.id} achievement={a} size="sm" />
          ))}
        </div>
      </Section>

      {/* Next event */}
      {nextEvent && (
        <Section title="Próximo evento" linkTo="/portal/app/events">
          <EventCard event={nextEvent} />
        </Section>
      )}
    </div>
  );
}

function CardLine({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function ActionButton({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
      {label}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function QuickStat({ value, label, emoji }: { value: string; label: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-3">
      <span className="text-lg">{emoji}</span>
      <span className="text-base font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function Section({ title, linkTo, children }: { title: string; linkTo?: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="flex items-center gap-0.5 text-xs font-medium text-primary">
            Ver todo <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </motion.section>
  );
}
