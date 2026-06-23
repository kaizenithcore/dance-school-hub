/**
 * SchoolPortalHubScreen — admin portal management hub V1.
 *
 * Shows the operational state of the student portal and gives the admin
 * access to the three things that matter right now:
 *   1. Branding configuration (colors, logo, font → applied to portal)
 *   2. Portal preview (open /s/:slug in a new tab)
 *   3. Notification management (send announcements to students)
 *
 * Social/community features are deferred to V2 and clearly marked as such.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Palette, ExternalLink, Megaphone, CheckCircle2,
  Users, ArrowRight, Smartphone,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { getTenantBranding } from "@/lib/api/branding";
import { getSchoolSettings } from "@/lib/api/settings";

export default function SchoolPortalHubScreen() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [branding, settings] = await Promise.allSettled([
          getTenantBranding(),
          getSchoolSettings(),
        ]);
        if (branding.status === "fulfilled" && branding.value) {
          setLogoUrl(branding.value.logo_url);
          setPrimaryColor(branding.value.primary_color);
        }
        if (settings.status === "fulfilled" && settings.value) {
          setSchoolSlug(settings.value.school?.slug ?? "");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageContainer
      title="Portal del alumno"
      description="Gestión y personalización del portal que ven tus alumnos"
    >
      {/* Status banner */}
      <div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/5 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Portal V1 activo</p>
          <p className="text-xs text-muted-foreground">
            Tus alumnos pueden ver sus clases, pagos y avisos. Acceden con el link de invitación que envías desde su ficha.
          </p>
        </div>
        {schoolSlug && (
          <a
            href={`/portal`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ver portal
          </a>
        )}
      </div>

      {/* Main grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* Branding */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Branding de la escuela</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Logo, colores y tipografía que se aplican automáticamente al portal de tus alumnos.
              </p>
            </div>
          </div>

          {/* Preview strip */}
          {!loading && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-md object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>
                  N
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Color principal</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block h-4 w-4 rounded-full border border-border" style={{ backgroundColor: primaryColor }} />
                  <span className="text-xs font-mono text-foreground">{primaryColor}</span>
                </div>
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to="/admin/settings/escuela">
              Gestionar branding <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Invite students */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Acceso de alumnos</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envía invitaciones magic link desde la ficha de cada alumno. Sin contraseña, acceso inmediato.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-medium text-foreground">Cómo funciona:</p>
            <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
              <li>Abre la ficha de un alumno en Alumnos</li>
              <li>Pulsa "Enviar acceso al portal"</li>
              <li>El alumno recibe un link de acceso directo</li>
            </ol>
          </div>

          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to="/admin/students">
              Ir a alumnos <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Announcements */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Avisos y comunicaciones</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Los alumnos ven tus avisos en la pantalla de inicio y en la sección Avisos del portal.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Los avisos se envían desde{" "}
              <strong className="text-foreground">Comunicaciones → Campañas de email</strong>.
              Aparecen automáticamente en el portal de tus alumnos.
            </p>
          </div>

          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to="/admin/communications">
              Ir a comunicaciones <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* V2 coming soon */}
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5">
        <div className="flex items-center gap-3 mb-3">
          <Smartphone className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">Próximamente en V2</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "Feed de publicaciones",
            "Galería de fotos",
            "Seguimiento de progreso",
            "Comunidad entre alumnos",
            "Gestión de eventos desde el portal",
          ].map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
