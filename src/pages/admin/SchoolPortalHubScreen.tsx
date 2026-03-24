import { Link } from "react-router-dom";
import { BarChart3, Building2, CalendarHeart, FileEdit, Megaphone } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Perfil",
    description: "Configura identidad publica, slug, logo y visibilidad de la escuela.",
    to: "/admin/school/settings",
    action: "Ir a Perfil",
    icon: Building2,
  },
  {
    title: "Analiticas",
    description: "Consulta engagement, conversion y embudo del portal de escuela.",
    to: "/admin/school/analytics",
    action: "Ver Analiticas",
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
    title: "Galeria",
    description: "Organiza albumes y fotos para eventos y actividad de escuela.",
    to: "/admin/school/gallery",
    action: "Abrir Galeria",
    icon: CalendarHeart,
  },
] as const;

export default function SchoolPortalHubScreen() {
  return (
    <PageContainer
      title="Portal Escuela"
      description="Centro de navegacion para perfil, analiticas y contenidos de escuela"
    >
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
              <Button asChild className="w-full">
                <Link to={section.to}>{section.action}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
