import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, BookOpen, Calendar, Bell,
  CreditCard, CheckCircle2, ChevronRight, Zap,
  FileText, Clock, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

/* ══════════════════════════════════════════════════════════════════ */
/*  1 ─ HERO                                                        */
/* ══════════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-accent/30 blur-3xl" />

      <div className="container relative text-center max-w-3xl mx-auto">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.span variants={item} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <Smartphone className="h-3.5 w-3.5" /> Portal del alumno
          </motion.span>

          <motion.h1 variants={item} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
            Tu escuela de danza,{" "}
            <span className="text-primary">siempre contigo.</span>
          </motion.h1>

          <motion.p variants={item} className="mt-5 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
            Consulta tus clases, revisa tus pagos y mantente al día con los avisos de tu escuela — todo desde el móvil.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
              <Link to="/portal/login">
                Acceder al portal <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <a href="#que-es">Descubrir más</a>
            </Button>
          </motion.div>
        </motion.div>

        {/* phone mockup — shows V1 real screens */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-14 mx-auto max-w-xs"
        >
          <div className="rounded-[2rem] border-2 border-border bg-card p-3 shadow-lg">
            <div className="rounded-[1.5rem] bg-background p-5 space-y-4">
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>9:41</span><span>●●●</span></div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">L</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Laura Fernández</p>
                  <p className="text-[11px] text-muted-foreground">Ballet · Contemporáneo</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: "3", l: "Clases" }, { v: "94%", l: "Asistencia" }, { v: "0", l: "Pendientes" }].map(s => (
                  <div key={s.l} className="rounded-xl bg-accent/50 p-2.5 text-center">
                    <p className="text-sm font-bold text-foreground">{s.v}</p>
                    <p className="text-[10px] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-card p-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-foreground">Próxima clase</p>
                <p className="text-[10px] text-muted-foreground">Ballet · Lunes 18:00h · Sala A</p>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-[10px] text-success">Confirmada</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  2 ─ QUÉ INCLUYE V1                                             */
/* ══════════════════════════════════════════════════════════════════ */
function WhatIs() {
  const points = [
    { icon: Calendar, text: "Tu horario de clases actualizado en tiempo real" },
    { icon: CreditCard, text: "Estado de tus pagos y recibos descargables" },
    { icon: Bell, text: "Avisos y comunicaciones de tu escuela" },
    { icon: BookOpen, text: "Tus inscripciones activas y datos de clase" },
  ];
  return (
    <section id="que-es" className="py-20 sm:py-28 bg-muted/30">
      <div className="container max-w-4xl text-center">
        <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }}>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">¿Qué es el Portal del alumno?</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Conectado con tu escuela, sin fricciones
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg">
            Una app web ligera que te da acceso instantáneo a la información que tu escuela gestiona en Nexa.
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
/*  3 ─ HORARIO Y CLASES                                           */
/* ══════════════════════════════════════════════════════════════════ */
function Schedule() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }}>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Horario</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Tu semana de un vistazo</h2>
            <p className="mt-4 text-muted-foreground">
              Consulta tus clases, el aula, el horario y el profesor — sin depender de grupos de WhatsApp ni de llamar a la escuela.
            </p>
            <ul className="mt-6 space-y-3">
              {["Horario semanal actualizado", "Sala y profesor asignados", "Clases canceladas o modificadas", "Avisos de cambios en tiempo real"].map(t => (
                <li key={t} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm max-w-sm mx-auto space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Esta semana</p>
              {[
                { day: "Lunes", time: "18:00–19:30", name: "Ballet Clásico", room: "Sala A", teacher: "Elena García" },
                { day: "Miércoles", time: "18:00–19:30", name: "Ballet Clásico", room: "Sala A", teacher: "Elena García" },
                { day: "Viernes", time: "17:00–18:00", name: "Contemporáneo", room: "Sala B", teacher: "Carlos Ruiz" },
              ].map(c => (
                <div key={c.day} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">{c.day.slice(0, 2)}</div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.time} · {c.room} · {c.teacher}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  4 ─ PAGOS                                                       */
/* ══════════════════════════════════════════════════════════════════ */
function Payments() {
  const stats = [
    { icon: CreditCard, label: "Estado del pago actual", value: "Al día" },
    { icon: Clock, label: "Próximo vencimiento", value: "1 oct" },
    { icon: FileText, label: "Recibos descargables", value: "PDF" },
    { icon: CheckCircle2, label: "Historial de pagos", value: "Completo" },
  ];
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container max-w-5xl">
        <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }} className="text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pagos y recibos</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Sin sorpresas en la cuota</h2>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">
            Consulta el estado de tus pagos y descarga recibos en PDF cuando los necesites — sin esperar al correo.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <motion.div key={s.label} variants={item} className="rounded-xl border border-border bg-card p-5 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  5 ─ AVISOS                                                      */
/* ══════════════════════════════════════════════════════════════════ */
function Notifications() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm max-w-sm mx-auto space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avisos recientes</p>
              {[
                { title: "Cambio de horario", body: "La clase del miércoles pasa a las 19:00h desde el 15 de octubre.", time: "hace 1h", dot: "bg-warning" },
                { title: "Recibo disponible", body: "Tu recibo de septiembre está listo para descargar.", time: "hace 2d", dot: "bg-success" },
                { title: "Cierre por festivo", body: "La academia permanecerá cerrada el 12 de octubre.", time: "hace 5d", dot: "bg-primary" },
              ].map(n => (
                <div key={n.title} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.dot}`} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }}>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Comunicaciones</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Los avisos de tu escuela, al instante</h2>
            <p className="mt-4 text-muted-foreground">
              Cambios de horario, festivos, nuevos recibos o cualquier comunicado llega directamente a tu portal — sin depender del email ni del grupo de WhatsApp.
            </p>
            <ul className="mt-6 space-y-3">
              {["Cambios de horario o aula", "Avisos de pago y recibos", "Comunicados generales de la escuela", "Notificaciones relevantes para tus clases"].map(t => (
                <li key={t} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> {t}
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
/*  6 ─ SI TU ESCUELA USA NEXA                                     */
/* ══════════════════════════════════════════════════════════════════ */
function SchoolUses() {
  const perks = [
    { icon: Calendar, text: "Horarios automáticos y siempre actualizados" },
    { icon: CreditCard, text: "Estado de pagos conectado con la gestión de la escuela" },
    { icon: Bell, text: "Comunicados directos desde el panel de la academia" },
    { icon: BookOpen, text: "Inscripciones y cambios reflejados al instante" },
  ];
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container max-w-4xl">
        <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }} className="text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Tu escuela y Nexa</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Si tu escuela ya usa Nexa</h2>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">
            Disfruta de una experiencia completa y conectada. La información se actualiza en tiempo real desde el panel de administración de tu escuela.
          </p>
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
/*  7 ─ FOMO — ¿TU ESCUELA AÚN NO LO USA?                         */
/* ══════════════════════════════════════════════════════════════════ */
function SchoolFomo() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container max-w-3xl text-center">
        <motion.div initial={fade.initial} whileInView={fade.animate} viewport={{ once: true }}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10">
            <Zap className="h-7 w-7 text-warning" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">¿Tu escuela aún no usa Nexa?</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
            Sugiere Nexa a tu academia y empieza a gestionar tu información como alumno de forma mucho más cómoda.
          </p>
          <div className="mt-8">
            <Button size="lg" className="h-12 px-8 text-base font-semibold" asChild>
              <a href="mailto:hola@nexa.es?subject=Un%20alumno%20sugiere%20Nexa&body=Hola%2C%20soy%20alumno%20de%20una%20escuela%20de%20danza%20y%20me%20gustar%C3%ADa%20sugerir%20Nexa.">
                Sugerir Nexa a mi escuela <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  8 ─ CTA FINAL                                                  */
/* ══════════════════════════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={fade.initial}
          whileInView={fade.animate}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-border bg-card p-10 sm:p-16 text-center overflow-hidden max-w-3xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20" />
          <div className="relative">
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Tu escuela en el bolsillo</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
              Accede a tu portal, consulta tus clases y pagos, y mantente al día con tu academia — desde cualquier dispositivo.
            </p>
            <div className="mt-8">
              <Button size="lg" className="h-12 px-10 text-base font-semibold" asChild>
                <Link to="/portal/login">
                  Acceder al portal <ArrowRight className="ml-1 h-4 w-4" />
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
/*  HEADER                                                         */
/* ══════════════════════════════════════════════════════════════════ */
function PortalHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/nexa_graphics/icon_big_black.png" alt="Nexa" className="h-7 w-7 object-contain" />
          <span className="text-sm font-semibold text-foreground">Nexa <span className="text-muted-foreground font-normal">Club</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal/login">Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/portal/login">Acceder</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/*  FOOTER                                                         */
/* ══════════════════════════════════════════════════════════════════ */
function PortalFooter() {
  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Nexa. Todos los derechos reservados.</p>
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
      <Schedule />
      <Payments />
      <Notifications />
      <SchoolUses />
      <SchoolFomo />
      <FinalCTA />
      <PortalFooter />
    </div>
  );
}
