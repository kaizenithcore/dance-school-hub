import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Compass,
  FileBadge,
  GraduationCap,
  MessageSquare,
  PenSquare,
  Rocket,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ScenarioKey = "no-enrollment" | "enrolled" | "community-enabled";

interface Scenario {
  key: ScenarioKey;
  title: string;
  subtitle: string;
  status: string;
  features: string[];
  timeline: Array<{ title: string; description: string; tag: string }>;
  ctas: Array<{ label: string; variant: "default" | "outline" | "secondary" }>;
}

const SCENARIOS: Scenario[] = [
  {
    key: "no-enrollment",
    title: "Persona sin matrícula activa",
    subtitle: "Se muestra el portal base con descubrimiento y onboarding.",
    status: "Sin escuela conectada",
    features: [
      "Explorar escuelas disponibles en Nexa",
      "Ver publicaciones públicas de escuelas",
      "Solicitar matrícula o plaza en lista de espera",
      "Completar perfil personal de bailarín",
      "Recibir notificaciones de estado de solicitud",
    ],
    timeline: [
      { title: "Tu perfil está al 40%", description: "Añade estilos, nivel y objetivo para destacar ante escuelas.", tag: "Perfil" },
      { title: "Escuelas recomendadas", description: "3 centros cercanos han abierto matrículas este mes.", tag: "Descubrir" },
      { title: "Solicitud enviada", description: "Tu solicitud a Dance North Academy está en revisión.", tag: "Matrícula" },
    ],
    ctas: [
      { label: "Buscar escuelas", variant: "default" },
      { label: "Completar perfil", variant: "outline" },
      { label: "Ver estado de solicitudes", variant: "secondary" },
    ],
  },
  {
    key: "enrolled",
    title: "Alumno matriculado en una escuela",
    subtitle: "Portal operativo con seguimiento académico y de actividad.",
    status: "Escuela conectada: Estudio Ballet Norte",
    features: [
      "Horario personal semanal con clases asignadas",
      "Progreso por disciplina y nivel",
      "Asistencia, rachas y logros",
      "Certificados y resultados de evaluación",
      "Agenda de eventos y recordatorios",
    ],
    timeline: [
      { title: "Clase hoy 18:00", description: "Ballet Intermedio con Prof. Rivera en Sala A.", tag: "Horario" },
      { title: "Nueva insignia desbloqueada", description: "Racha de 4 semanas de asistencia completada.", tag: "Logros" },
      { title: "Certificación disponible", description: "Ballet Nivel 2 aprobada. Puedes descargar el PDF.", tag: "Certificados" },
    ],
    ctas: [
      { label: "Ver mi horario", variant: "default" },
      { label: "Abrir progreso", variant: "outline" },
      { label: "Mis certificados", variant: "secondary" },
    ],
  },
  {
    key: "community-enabled",
    title: "Escuela con publicaciones y eventos habilitados",
    subtitle: "Además del portal de alumno, se activa módulo social y colaborativo.",
    status: "Comunidad activa: compartir y crear publicaciones/eventos",
    features: [
      "Feed de publicaciones de escuela y alumnado",
      "Compartir avances, vídeos y certificaciones",
      "Crear publicaciones desde el portal",
      "Crear/editar eventos internos de comunidad",
      "Interacciones: comentarios, reacciones y menciones",
    ],
    timeline: [
      { title: "Nueva publicación destacada", description: "La escuela ha publicado ensayo general del festival.", tag: "Feed" },
      { title: "Evento creado", description: "Jam Session sábado 19:30 creado por coordinación.", tag: "Evento" },
      { title: "Tu post fue compartido", description: "Tu vídeo de técnica fue republicado por la escuela.", tag: "Comunidad" },
    ],
    ctas: [
      { label: "Crear publicación", variant: "default" },
      { label: "Crear evento", variant: "outline" },
      { label: "Abrir feed", variant: "secondary" },
    ],
  },
];

function scenarioIcon(key: ScenarioKey) {
  if (key === "no-enrollment") return <Compass className="h-4 w-4" />;
  if (key === "enrolled") return <GraduationCap className="h-4 w-4" />;
  return <Users className="h-4 w-4" />;
}

function timelineIcon(tag: string) {
  if (tag === "Perfil") return <Sparkles className="h-4 w-4 text-primary" />;
  if (tag === "Descubrir") return <Compass className="h-4 w-4 text-primary" />;
  if (tag === "Matrícula") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (tag === "Horario") return <CalendarDays className="h-4 w-4 text-primary" />;
  if (tag === "Logros") return <Rocket className="h-4 w-4 text-primary" />;
  if (tag === "Certificados") return <FileBadge className="h-4 w-4 text-primary" />;
  if (tag === "Feed") return <Bell className="h-4 w-4 text-primary" />;
  if (tag === "Evento") return <CalendarDays className="h-4 w-4 text-primary" />;
  return <Share2 className="h-4 w-4 text-primary" />;
}

export default function StudentPortalMockupPage() {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("no-enrollment");

  const selected = useMemo(
    () => SCENARIOS.find((scenario) => scenario.key === activeScenario) ?? SCENARIOS[0],
    [activeScenario]
  );

  return (
    <div className="min-h-screen bg-background pb-14">
      <header className="border-b bg-card/90 backdrop-blur">
        <div className="container flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Demo visual estática</p>
            <h1 className="text-2xl font-bold tracking-tight">Mockup Nexa Club</h1>
            <p className="text-sm text-muted-foreground">Ejemplo sin datos reales para validar UX en 3 escenarios de negocio.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/portal">Landing portal</Link>
            </Button>
            <Button asChild>
              <Link to="/portal/app">Ver app actual</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Escenario</CardTitle>
            <CardDescription>Selecciona el caso que quieres enseñar en la demo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SCENARIOS.map((scenario) => {
              const active = scenario.key === selected.key;
              return (
                <button
                  key={scenario.key}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                  }`}
                  onClick={() => setActiveScenario(scenario.key)}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {scenarioIcon(scenario.key)}
                    {scenario.title}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{scenario.subtitle}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{selected.title}</CardTitle>
                <Badge variant="secondary">{selected.status}</Badge>
              </div>
              <CardDescription>{selected.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {selected.features.map((feature) => (
                  <div key={feature} className="rounded-lg border bg-muted/20 p-3 text-sm text-foreground">
                    {feature}
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {selected.ctas.map((cta) => (
                  <Button key={cta.label} variant={cta.variant}>
                    {cta.variant === "default" ? <PenSquare className="mr-2 h-4 w-4" /> : null}
                    {cta.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vista previa de actividad</CardTitle>
              <CardDescription>
                Simulación de módulos que debe ver el alumno según capacidades activadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected.timeline.map((entry) => (
                <div key={entry.title} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="mt-0.5">{timelineIcon(entry.tag)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {entry.tag}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cobertura funcional por escenario</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-foreground">Sin matrícula</p>
                <p className="mt-1 text-muted-foreground">Descubrir escuela, crear perfil, iniciar solicitud.</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-foreground">Matriculado</p>
                <p className="mt-1 text-muted-foreground">Horario, progreso, certificados, eventos.</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-semibold text-foreground">Comunidad activa</p>
                <p className="mt-1 text-muted-foreground">Publicar, compartir y crear eventos internos.</p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
            Este mockup es completamente visual y no usa datos dinámicos. Sirve como referencia de UX para validar alcance antes de conectar APIs reales.
            <div className="mt-2 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Siguiente fase sugerida: conectar este selector a un feature flag en backend para demos por tenant.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
