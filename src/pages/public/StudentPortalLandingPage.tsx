import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, BookOpen, Award, Calendar, Trophy, Users,
  Star, Target, Music, Heart, CheckCircle2, ChevronRight, Flame,
  PartyPopper, Medal, Eye, Download, Share2, MessageCircle, Search,
  Clock, TrendingUp, Smartphone, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── animation helpers ── */
const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

/* ══════════════════════════════════════════════════════════════════ */
/*  1 ─ HERO                                                        */
/* ══════════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-accent/30 blur-3xl" />

      <div className="container relative text-center max-w-3xl mx-auto">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.span variants={item} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Tu perfil como bailarín
          </motion.span>

          <motion.h1 variants={item} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
            Tu historia como bailarín{" "}
            <span className="text-primary">empieza aquí.</span>
          </motion.h1>

          <motion.p variants={item} className="mt-5 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
            Sigue tus clases, guarda tus certificaciones y crea tu perfil como bailarín. Todo en un solo lugar.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
              <Link to="/auth/register">
                Crear perfil gratis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <a href="#que-es">Descubrir más</a>
            </Button>
          </motion.div>
        </motion.div>

        {/* phone mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-14 mx-auto max-w-xs"
        >
          <div className="rounded-[2rem] border-2 border-border bg-card p-3 shadow-lg">
            <div className="rounded-[1.5rem] bg-background p-5 space-y-4">
              {/* status bar */}
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>9:41</span><span>●●●</span></div>
              {/* avatar */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">L</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Laura Fernández</p>
                  <p className="text-[11px] text-muted-foreground">Ballet · Contemporáneo</p>
                </div>
              </div>
              {/* stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[{ v: "82", l: "Clases" }, { v: "94%", l: "Asistencia" }, { v: "5", l: "Certificados" }].map(s => (
                  <div key={s.l} className="rounded-xl bg-accent/50 p-2.5 text-center">
                    <p className="text-sm font-bold text-foreground">{s.v}</p>
                    <p className="text-[10px] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
              {/* achievements */}
              <div className="flex gap-2">
                {["🏆", "🎭", "⭐", "🔥"].map(e => (
                  <div key={e} className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-sm">{e}</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  2 ─ QUÉ ES DANCEHUB                                            */
/* ══════════════════════════════════════════════════════════════════ */
function WhatIs() {
  const points = [
    { icon: BookOpen, text: "Ver tus clases y horarios actualizados" },
    { icon: TrendingUp, text: "Seguir tu progreso como bailarín" },
    { icon: PartyPopper, text: "Participar en eventos y festivales" },
    { icon: Award, text: "Obtener y guardar certificaciones oficiales" },
  ];
  return (
    <section id="que-es" className="py-20 sm:py-28 bg-muted/30">
      <div className="container max-w-4xl text-center">
        <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }}>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">¿Qué es DanceHub?</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            La plataforma que conecta alumnos y escuelas de danza
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg">
            DanceHub es mucho más que una app. Es tu identidad dentro del mundo de la danza.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid sm:grid-cols-2 gap-4">
          {points.map(p => (
            <motion.div key={p.text} variants={item} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <p.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{p.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  3 ─ PERFIL DE BAILARÍN                                         */
/* ══════════════════════════════════════════════════════════════════ */
function DancerProfile() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-5xl mx-auto">
            <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }}>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Perfil de bailarín</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Tu portafolio como bailarín</h2>
            <p className="mt-4 text-muted-foreground">
              Muestra tu evolución, estilos, certificaciones y los eventos en los que has participado. Todo en un perfil público que puedes compartir.
            </p>
            <ul className="mt-6 space-y-3">
              {["Tu nombre y escuela", "Estilos que practicas", "Certificaciones obtenidas", "Eventos y festivales"].map(t => (
                <li key={t} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* profile card mockup */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm max-w-sm mx-auto">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">M</div>
                <div>
                  <p className="font-semibold text-foreground">María López</p>
                  <p className="text-xs text-muted-foreground">Escuela Arte en Movimiento</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["Ballet", "Jazz", "Contemporáneo"].map(s => (
                  <span key={s} className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">{s}</span>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[{ v: "4", l: "Certificados" }, { v: "6", l: "Eventos" }, { v: "3", l: "Años" }].map(s => (
                  <div key={s.l} className="rounded-lg bg-muted p-2">
                    <p className="text-sm font-bold text-foreground">{s.v}</p>
                    <p className="text-[10px] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  4 ─ SEGUIMIENTO DE PROGRESO                                    */
/* ══════════════════════════════════════════════════════════════════ */
function Progress() {
  const stats = [
    { icon: BookOpen, label: "Clases completadas", value: "82" },
    { icon: Clock, label: "Horas de práctica", value: "164h" },
    { icon: Target, label: "Nivel actual", value: "Intermedio" },
    { icon: Award, label: "Certificaciones", value: "5" },
  ];
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container max-w-5xl">
        <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }} className="text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Seguimiento de progreso</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Cada clase cuenta</h2>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">Registra tu asistencia, niveles alcanzados y certificaciones. Observa cómo creces como bailarín.</p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <motion.div key={s.label} variants={item} className="rounded-xl border border-border bg-card p-5 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  5 ─ SISTEMA DE LOGROS                                          */
/* ══════════════════════════════════════════════════════════════════ */
function Achievements() {
  const badges = [
    { emoji: "🎭", title: "Primer festival", desc: "Participaste en tu primer festival." },
    { emoji: "💯", title: "100 clases", desc: "Has completado 100 clases." },
    { emoji: "🔥", title: "Racha de 4 semanas", desc: "Asistencia perfecta durante 1 mes." },
    { emoji: "🏆", title: "3 años en la escuela", desc: "Fidelidad y constancia reconocidas." },
    { emoji: "⭐", title: "5 certificaciones", desc: "Has aprobado 5 exámenes oficiales." },
    { emoji: "🎪", title: "Estrella del escenario", desc: "Participaste en 3 exhibiciones." },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="container max-w-5xl">
        <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }} className="text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Sistema de logros</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Desbloquea logros bailando</h2>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">Cada clase, cada evento y cada certificación te acercan a nuevos logros. ¿Cuántos puedes conseguir?</p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(b => (
            <motion.div key={b.title} variants={item} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="text-2xl">{b.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  6 ─ EVENTOS Y PARTICIPACIÓN                                    */
/* ══════════════════════════════════════════════════════════════════ */
function Events() {
  const events = [
    { icon: PartyPopper, name: "Festivales" },
    { icon: Star, name: "Exhibiciones" },
    { icon: Trophy, name: "Competiciones" },
    { icon: Music, name: "Workshops" },
  ];
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div {...fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Eventos</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Cada escenario forma parte de tu historia</h2>
            <p className="mt-4 text-muted-foreground">
              Los festivales, exhibiciones y competiciones en los que participas quedan registrados en tu perfil. Tu trayectoria como bailarín merece ser recordada.
            </p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 gap-3">
            {events.map(e => (
              <motion.div key={e.name} variants={item} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <e.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">{e.name}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  7 ─ CERTIFICACIONES                                            */
/* ══════════════════════════════════════════════════════════════════ */
function Certifications() {
  const actions = [
    { icon: Eye, text: "Consultar en cualquier momento" },
    { icon: Download, text: "Descargar en PDF" },
    { icon: Share2, text: "Compartir con quien quieras" },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="container max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* cert mockup */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="rounded-2xl border border-border bg-card p-6 max-w-sm mx-auto text-center shadow-sm">
              <Award className="h-10 w-10 text-primary mx-auto" />
              <p className="mt-3 text-xs text-muted-foreground uppercase tracking-wider">Certificado Oficial</p>
              <p className="mt-1 text-lg font-bold text-foreground">Ballet Clásico — Nivel 3</p>
              <p className="text-sm text-muted-foreground mt-1">Otorgado a Laura Fernández</p>
              <div className="mt-4 h-px bg-border" />
              <p className="mt-3 text-xs text-muted-foreground">15 de junio de 2026 · Escuela Arte en Movimiento</p>
            </div>
          </motion.div>

          <motion.div {...fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Certificaciones</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Tus logros, siempre accesibles</h2>
            <p className="mt-4 text-muted-foreground">
              Los exámenes y certificados quedan guardados en tu perfil. Nunca más pierdas un diploma.
            </p>
            <ul className="mt-6 space-y-3">
              {actions.map(a => (
                <li key={a.text} className="flex items-center gap-3 text-sm text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                    <a.icon className="h-4 w-4 text-accent-foreground" />
                  </div>
                  {a.text}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  8 ─ COMUNIDAD                                                  */
/* ══════════════════════════════════════════════════════════════════ */
function Community() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container max-w-4xl text-center">
        <motion.div {...fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Comunidad</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Forma parte de algo más grande</h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Descubre a otros bailarines, inspírate con sus logros y comparte tu progreso. Una comunidad de danza real, no una red social.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Users, title: "Descubrir bailarines", desc: "Explora perfiles de otros alumnos de danza." },
            { icon: Heart, title: "Seguir perfiles", desc: "Mantente al día con bailarines que te inspiran." },
            { icon: Trophy, title: "Ver logros", desc: "Celebra los éxitos de la comunidad." },
          ].map(f => (
            <motion.div key={f.title} variants={item} className="rounded-xl border border-border bg-card p-5">
              <f.icon className="h-6 w-6 text-primary mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  9 ─ SI TU ESCUELA USA DANCEHUB                                 */
/* ══════════════════════════════════════════════════════════════════ */
function SchoolUses() {
  const perks = [
    { icon: Calendar, text: "Horarios automáticos y siempre actualizados" },
    { icon: PartyPopper, text: "Eventos de tu escuela en tu perfil" },
    { icon: BookOpen, text: "Seguimiento completo de tus clases" },
    { icon: Award, text: "Certificaciones oficiales verificadas" },
  ];
  return (
    <section className="py-20 sm:py-28">
      <div className="container max-w-4xl">
        <motion.div {...fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Tu escuela y DanceHub</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Si tu escuela ya usa DanceHub</h2>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">Disfruta de una experiencia completa, conectada con la gestión de tu escuela.</p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid sm:grid-cols-2 gap-4">
          {perks.map(p => (
            <motion.div key={p.text} variants={item} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <p.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{p.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/* 10 ─ SI TU ESCUELA AÚN NO LO USA (FOMO)                        */
/* ══════════════════════════════════════════════════════════════════ */
function SchoolFomo() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container max-w-3xl text-center">
        <motion.div {...fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10">
            <Zap className="h-7 w-7 text-warning" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">¿Tu escuela aún no usa DanceHub?</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
            Miles de alumnos ya disfrutan de una experiencia moderna. Sugiere DanceHub a tu escuela y desbloquea todas las ventajas.
          </p>
          <div className="mt-8">
            <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
              <a href="mailto:hola@dancehub.es?subject=Un%20alumno%20sugiere%20DanceHub&body=Hola%2C%20soy%20alumno%20de%20una%20escuela%20de%20danza%20y%20me%20gustar%C3%ADa%20sugerir%20DanceHub.">
                Sugerir DanceHub a mi escuela <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/* 11 ─ CTA FINAL                                                  */
/* ══════════════════════════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          {...fade}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative rounded-3xl border border-border bg-card p-10 sm:p-16 text-center overflow-hidden max-w-3xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20" />
          <div className="relative">
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Empieza tu historia como bailarín</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
              Crea tu perfil gratis, sigue tu progreso y forma parte de la comunidad de danza más moderna.
            </p>
            <div className="mt-8">
              <Button size="lg" className="h-12 px-10 text-base font-semibold" asChild>
                <Link to="/auth/register">
                  Crear perfil gratis <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  HEADER (mini, dedicated)                                       */
/* ══════════════════════════════════════════════════════════════════ */
function PortalHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">D</span>
          </div>
          <span className="text-sm font-semibold text-foreground">DanceHub <span className="text-muted-foreground font-normal">Portal</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth/login">Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth/register">Crear perfil</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  FOOTER (minimal)                                               */
/* ══════════════════════════════════════════════════════════════════ */
function PortalFooter() {
  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} DanceHub. Todos los derechos reservados.</p>
        <div className="flex gap-4">
          <Link to="/legal/privacy" className="hover:text-foreground transition-colors">Privacidad</Link>
          <Link to="/legal/terms" className="hover:text-foreground transition-colors">Términos</Link>
          <Link to="/" className="hover:text-foreground transition-colors">Para escuelas →</Link>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  PAGE                                                           */
/* ══════════════════════════════════════════════════════════════════ */
export default function StudentPortalLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PortalHeader />
      <Hero />
      <WhatIs />
      <DancerProfile />
      <Progress />
      <Achievements />
      <Events />
      <Certifications />
      <Community />
      <SchoolUses />
      <SchoolFomo />
      <FinalCTA />
      <PortalFooter />
    </div>
  );
}
