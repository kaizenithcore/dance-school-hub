import { Link } from "react-router-dom";
import { Globe, Sparkles, ArrowRight, Palette, ExternalLink, CheckCircle2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { commercialCatalog, formatEuro } from "@/lib/commercialCatalog";

type IntegratedWebsiteCatalog = {
  label: string; shortDescription: string; includes?: string[];
  pricingByPlanEur?: { starter?: number; pro?: number; enterprise?: number };
};
type StandaloneWebsiteCatalog = {
  label: string; shortDescription: string;
  tierPricingEur?: { basic?: number; standard?: number; complete?: number };
};

const INTEGRATED_FEATURES = [
  "Diseño responsive adaptado a tu identidad visual",
  "Horario público actualizado en tiempo real desde Nexa",
  "Formulario de matrícula online conectado directamente",
  "SEO local optimizado para búsquedas de tu ciudad",
  "Blog o sección de noticias integrado",
  "Galería de fotos y vídeos de la escuela",
];

const STANDALONE_FEATURES = [
  "Web profesional sin necesitar Nexa activo",
  "Diseño a medida según tu imagen de marca",
  "Integración futura con Nexa cuando estés listo",
];

export default function WebsitePage() {
  const webCatalog = commercialCatalog.professionalServices as Record<string, unknown>;
  const integratedWebsite = (webCatalog.integratedWebsite as IntegratedWebsiteCatalog | undefined) ?? null;
  const standaloneWebsite = (webCatalog.standaloneWebsite as StandaloneWebsiteCatalog | undefined) ?? null;

  const integratedPrice = integratedWebsite?.pricingByPlanEur?.starter ?? 1490;
  const standaloneBasicPrice = standaloneWebsite?.tierPricingEur?.basic ?? 890;

  return (
    <PageContainer title="Página web">
      <div className="max-w-4xl space-y-6">

        {/* Intro */}
        <p className="text-sm text-muted-foreground">
          Tu escuela puede tener una web profesional lista para captar alumnos.
          Elige el formato que mejor encaja con tu momento actual.
        </p>

        {/* Options grid */}
        <div className="grid gap-4 md:grid-cols-2">

          {/* Integrated */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 space-y-4 flex flex-col">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Globe className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Recomendada</span>
              </div>
              <p className="text-base font-bold text-foreground">Web integrada con Nexa</p>
              <p className="text-sm text-muted-foreground mt-1">
                Una web de escuela de danza conectada a tu panel de gestión.
                El horario, las inscripciones y el branding se sincronizan automáticamente.
              </p>
            </div>

            <ul className="space-y-1.5 flex-1">
              {INTEGRATED_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Desde <strong className="text-foreground text-base">{formatEuro(integratedPrice)}</strong> · pago único</p>
              <Button className="w-full" asChild>
                <a href="mailto:nexa@kaizenith.es?subject=Quiero%20mi%20web%20integrada%20con%20Nexa&body=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20la%20web%20integrada%20con%20Nexa%20para%20mi%20escuela%20de%20danza.">
                  Solicitar diagnóstico gratuito <ArrowRight className="h-4 w-4 ml-1.5" />
                </a>
              </Button>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Diagnóstico gratuito · Sin compromiso</p>
            </div>
          </div>

          {/* Standalone */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 flex flex-col">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted mb-2">
                <Sparkles className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <p className="text-base font-bold text-foreground">Web independiente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Web profesional sin integración con Nexa. Ideal si quieres establecer tu presencia online
                mientras decides cuándo integrar la gestión completa.
              </p>
            </div>

            <ul className="space-y-1.5 flex-1">
              {STANDALONE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Desde <strong className="text-foreground text-base">{formatEuro(standaloneBasicPrice)}</strong> · pago único</p>
              <Button variant="outline" className="w-full" asChild>
                <a href="mailto:nexa@kaizenith.es?subject=Consulta%20web%20independiente%20para%20escuela%20de%20danza&body=Hola%2C%20me%20gustar%C3%ADa%20una%20propuesta%20para%20una%20web%20independiente.">
                  Pedir propuesta <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Branding redirect — no duplicate panel */}
        <div className="rounded-lg border border-border bg-muted/20 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Identidad visual</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Logo, colores y tipografía se configuran desde la sección de Escuela en Configuración.
              Cualquier cambio se aplica automáticamente a tu portal, recibos y documentos.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link to="/admin/settings/branding">
              <Palette className="h-3.5 w-3.5 mr-1.5" /> Editar identidad visual
            </Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
