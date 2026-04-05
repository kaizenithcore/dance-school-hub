import { BarChart3, Building2, CalendarHeart, FileEdit, Megaphone, CalendarPlus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Perfil",
    description: "Ajusta identidad pública, slug, logo y visibilidad en un solo lugar.",
    to: "/admin/school/settings",
    action: "Ir a Perfil",
    icon: Building2,
  },
  {
    title: "Analíticas",
    description: "Sigue engagement y conversión del portal de escuela.",
    to: "/admin/school/analytics",
    action: "Ver Analíticas",
    icon: BarChart3,
  },
  {
    title: "Publicaciones",
    description: "Gestiona el feed y modera contenido docente.",
    to: "/admin/school/posts",
    action: "Abrir Publicaciones",
    icon: FileEdit,
  },
  {
    title: "Anuncios",
    description: "Publica comunicados clave para alumnos y familias.",
    to: "/admin/school/announcements",
    action: "Abrir Anuncios",
    icon: Megaphone,
  },
  {
    title: "Galería",
    description: "Organiza álbumes para clases, eventos y comunidad.",
    to: "/admin/school/gallery",
    action: "Abrir Galería",
    icon: CalendarHeart,
  },
] as const;

export default function SchoolPortalHubScreen() {
  return (
    <PageContainer
      title="Nexa Crew"
      description="Centro editorial del portal del alumno para acelerar comunicación y marca"
    >
      <Card className="mb-4 border-amber-300/40 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-amber-700 dark:text-amber-300">Nexa Crew en activación progresiva</CardTitle>
          <CardDescription>
            Ya puedes preparar la estructura del portal. Los módulos se irán habilitando por fases para asegurar una salida estable.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CalendarPlus className="h-5 w-5" />
          </div>
          <CardTitle>Publicar eventos en el portal del alumno</CardTitle>
          <CardDescription>
            Próximamente podrás publicar eventos con control de visibilidad por fecha, estado y tipo de audiencia.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled>
            Activar publicación (Próximamente)
          </Button>
          <p className="text-xs text-muted-foreground">
            Función en despliegue por lotes.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.to} className="h-full">
            <CardHeader>
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <section.icon className="h-5 w-5" />
              </div>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" className="w-full" disabled>
                {section.action} (Próximamente)
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Disponible en siguientes iteraciones.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
