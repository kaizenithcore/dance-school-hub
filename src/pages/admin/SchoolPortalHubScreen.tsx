import { BarChart3, Building2, CalendarHeart, FileEdit, Megaphone, CalendarPlus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Perfil",
    description: "Configura identidad pública, slug, logo y visibilidad de la escuela.",
    to: "/admin/school/settings",
    action: "Ir a Perfil",
    icon: Building2,
  },
  {
    title: "Analíticas",
    description: "Consulta engagement, conversión y embudo del portal de escuela.",
    to: "/admin/school/analytics",
    action: "Ver Analíticas",
    icon: BarChart3,
  },
  {
    title: "Publicaciones",
    description: "Gestiona el feed, modera contenido docente y administra estados.",
    to: "/admin/school/posts",
    action: "Abrir Publicaciones",
    icon: FileEdit,
  },
  {
    title: "Anuncios",
    description: "Publica comunicados importantes y notificaciones para alumnos.",
    to: "/admin/school/announcements",
    action: "Abrir Anuncios",
    icon: Megaphone,
  },
  {
    title: "Galería",
    description: "Organiza álbumes y fotos para eventos y actividad de escuela.",
    to: "/admin/school/gallery",
    action: "Abrir Galería",
    icon: CalendarHeart,
  },
] as const;

export default function SchoolPortalHubScreen() {
  return (
    <PageContainer
      title="Nexa Crew"
      description="Centro de navegación para perfil, analíticas y contenidos de escuela"
    >
      <Card className="mb-4 border-amber-300/40 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-amber-700 dark:text-amber-300">Nexa Crew está en desarrollo</CardTitle>
          <CardDescription>
            Estamos trabajando para lanzar Nexa Crew, el portal de escuela que permitirá gestionar perfil, analíticas y contenidos.
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
            Próximamente podrás seleccionar eventos y publicarlos directamente en el portal del alumno con visibilidad por fecha y estado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled>
            Configurar publicación (Próximamente)
          </Button>
          <p className="text-xs text-muted-foreground">
            Sección preparada para la siguiente iteración funcional.
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
                {section.action} (En desarrollo)
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Disponible próximamente.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
