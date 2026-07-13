import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, Check, Users, BookOpen, CreditCard,
  Bell, BarChart2, Calendar, Menu, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buildRegisterHref, freeTrialDays, planCatalog, planOrder, formatEuro } from "@/lib/commercialCatalog";
import { LandingFooter } from "@/components/landing/LandingFooter";

const CTA_HREF = buildRegisterHref("hero");

// ── Nav ─────────────────────────────────────────────────────────────────────
function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/nexa_graphics/icon_big_trans.PNG" alt="Nexa Clases" className="h-8 w-8 object-contain" />
          <span className="text-base font-semibold text-foreground">Nexa Clases</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {[{ label: "Funciones", href: "#features" }, { label: "Precios", href: "#pricing" }, { label: "FAQ", href: "#faq" }].map((n) => (
            <a key={n.label} href={n.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{n.label}</a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle size="sm" />
          <Button variant="ghost" size="sm" asChild><Link to="/auth/login">Iniciar sesión</Link></Button>
          <Button size="sm" asChild><Link to={CTA_HREF} className="rounded-xl">Probar gratis</Link></Button>
        </div>
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle size="sm" />
          <button className="p-2 text-foreground" onClick={() => setOpen(!open)} aria-label={open ? "Cerrar" : "Abrir menú"}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-card px-6 py-4 space-y-3">
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" asChild><Link to="/auth/login">Iniciar sesión</Link></Button>
            <Button size="sm" className="flex-1" asChild><Link to={CTA_HREF}>Probar gratis</Link></Button>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-background to-background" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Más tiempo para enseñar, menos para gestionar
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-foreground leading-[1.1]">
              El sistema para tu academia de{" "}
              <span className="text-primary">clases particulares.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-lg">
              Alumnos, horarios, pagos, evaluaciones y comunicación con familias — todo organizado en un panel pensado para academias de refuerzo y tutorías.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="h-12 rounded-xl px-7 text-base font-semibold shadow-md hover:shadow-lg" asChild>
                <Link to={CTA_HREF}>Probar gratis <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded-xl px-7 text-base" asChild>
                <Link to="/auth/login">Ver demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{freeTrialDays} días gratis · Sin tarjeta · Sin compromiso</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
            <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 text-[11px] text-muted-foreground font-mono">nexaclases/admin</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Alumnos activos", value: "87" },
                    { label: "Clases esta semana", value: "34" },
                    { label: "Cobros pendientes", value: "3" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-medium text-foreground mb-2">Horario de hoy</p>
                  <div className="space-y-1.5">
                    {[
                      { hora: "16:00", materia: "Matemáticas 4ºESO", alumno: "Pablo M." },
                      { hora: "17:30", materia: "Inglés B2", alumno: "Lucía R." },
                      { hora: "19:00", materia: "Física 2ºBachillerato", alumno: "Grupo B" },
                    ].map((c) => (
                      <div key={c.hora} className="flex items-center gap-2 text-[11px]">
                        <span className="text-primary font-bold w-10">{c.hora}</span>
                        <span className="text-muted-foreground flex-1">{c.materia}</span>
                        <span className="text-foreground font-medium">{c.alumno}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-medium text-foreground mb-2">Últimas notas</p>
                  <div className="space-y-1.5">
                    {[
                      { alumno: "Pablo M.", materia: "Mates", nota: "7.5" },
                      { alumno: "Lucía R.", materia: "Inglés", nota: "9.0" },
                    ].map((n) => (
                      <div key={n.alumno} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{n.alumno} — {n.materia}</span>
                        <span className="text-primary font-bold">{n.nota}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Users,
    title: "Gestión de alumnos",
    desc: "Ficha completa con materias, nivel, horario personal y contacto de la familia. Historial de asistencia y notas en un clic.",
  },
  {
    icon: Calendar,
    title: "Horarios y sesiones",
    desc: "Crea clases individuales o grupos. El horario se gestiona desde un calendario visual. Los cambios se notifican automáticamente.",
  },
  {
    icon: BookOpen,
    title: "Evaluaciones y notas",
    desc: "Registra las notas por materia y periodo. El alumno y su familia las ven en el portal. Genera informes de progreso en PDF.",
  },
  {
    icon: CreditCard,
    title: "Cobros mensuales",
    desc: "Define el precio por alumno o por sesión. Cobra automáticamente cada mes. Control de impagados sin Excel ni llamadas.",
  },
  {
    icon: Bell,
    title: "Comunicación con familias",
    desc: "Envía avisos por email a toda la academia, a un grupo o a un alumno. Informa de cambios de horario o resultados de examen.",
  },
  {
    icon: BarChart2,
    title: "Panel de control",
    desc: "Alumnos activos, clases impartidas, ingresos del mes y tasa de renovación — todo visible en el panel de inicio.",
  },
];

function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/20">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Todo lo que necesitas para tu academia</h2>
          <p className="mt-4 text-muted-foreground">Sin módulos extra de pago. Sin curva de aprendizaje. Lista en minutos.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl border border-border bg-card p-6 space-y-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function Pricing() {
  const [annual, setAnnual] = useState(true);
  const displayedPlans = planOrder.filter((p) => p !== "enterprise");

  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Precios claros, sin letra pequeña</h2>
          <p className="mt-4 text-muted-foreground">Empieza gratis. Crece sin sorpresas.</p>
        </motion.div>

        <div className="flex items-center justify-center gap-3 mb-10">
          {(["Mensual", "Anual"] as const).map((label) => {
            const isAnnual = label === "Anual";
            return (
              <button key={label} onClick={() => setAnnual(isAnnual)}
                className={cn("text-sm font-medium px-5 py-2.5 rounded-full transition-colors",
                  annual === isAnnual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {label}
                {isAnnual && <span className="ml-1.5 text-[10px] font-bold opacity-80">2 meses gratis</span>}
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {displayedPlans.map((planType, i) => {
            const plan = planCatalog[planType];
            const price = annual ? Math.round(plan.billing.annualTotalEur / 12) : plan.billing.monthlyPriceEur;
            return (
              <motion.div key={planType} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={cn("rounded-2xl border p-8 flex flex-col relative",
                  plan.highlighted ? "border-primary bg-card shadow-xl ring-1 ring-primary/20 scale-[1.02]" : "border-border bg-card")}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground whitespace-nowrap">Más popular</span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{formatEuro(price)}</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
                {annual && plan.billing.annualSavingsLabel && (
                  <p className="mt-1 text-xs font-medium text-success">{plan.billing.annualSavingsLabel}</p>
                )}
                <ul className="mt-6 space-y-3 flex-1">
                  {(planType === "starter"
                    ? ["Hasta 100 alumnos activos", "Clases individuales y grupales", "Evaluaciones y notas por materia", "Cobros automáticos mensuales", "Portal del alumno y familias", "Comunicación masiva por email"]
                    : ["Todo en Starter", "Hasta 300 alumnos activos", "Soporte prioritario incluido", "Bloques de alumnos extra"]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" variant={plan.highlighted ? "default" : "outline"} size="lg" asChild>
                  <Link to={buildRegisterHref("pricing", { planType, billing: annual ? "annual" : "monthly" })}>
                    {planType === "starter" ? "Empezar con Starter" : "Empezar con Pro"} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "¿Funciona para clases individuales y grupos?", a: "Sí. Puedes crear clases individuales (un alumno con un profesor) o grupos de hasta el tamaño que necesites. Cada clase tiene su propio horario, precio y lista de alumnos." },
  { q: "¿Las familias pueden ver las notas y el horario?", a: "Sí. El portal del alumno (accesible desde móvil o tablet) muestra el horario de sesiones, las notas registradas por el profesor y los avisos del centro. No necesita instalación." },
  { q: "¿Puedo cobrar por sesión en vez de mensualmente?", a: "Sí. El sistema permite configurar el precio por sesión o una cuota mensual fija. También puedes definir bonos de sesiones prepagadas. Todo se cobra de forma automática." },
  { q: "¿Cuánto tarda la puesta en marcha?", a: `Menos de 30 minutos. El asistente inicial te guía: datos de tu academia, primera materia, primer alumno y cobro. A partir de ahí el sistema funciona solo.` },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="py-24 sm:py-32 bg-muted/20">
      <div className="container max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">Preguntas frecuentes</h2>
        </motion.div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card overflow-hidden">
              <button type="button"
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-accent/30 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}>
                {faq.q}
                {open === i ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>
              {open === i && <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</div>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container text-center max-w-xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Empieza a organizar tu academia hoy.</h2>
          <p className="mt-4 text-muted-foreground">{freeTrialDays} días de prueba gratuita. Sin tarjeta de crédito. Sin compromiso.</p>
          <Button size="lg" className="mt-8 h-12 rounded-xl px-8 text-base font-semibold shadow-md hover:shadow-lg" asChild>
            <Link to={CTA_HREF}>Empezar gratis <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TutoringLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Features />
      <div id="pricing"><Pricing /></div>
      <FAQ />
      <CTA />
      <LandingFooter />
    </div>
  );
}
