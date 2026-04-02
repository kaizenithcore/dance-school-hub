import { Globe, Rocket, Sparkles, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { commercialCatalog, formatEuro } from "@/lib/commercialCatalog";

type IntegratedWebsiteCatalog = {
  label: string;
  shortDescription: string;
  includes?: string[];
  pricingByPlanEur?: {
    starter?: number;
    pro?: number;
    enterprise?: number;
  };
};

type StandaloneWebsiteCatalog = {
  label: string;
  shortDescription: string;
  tierPricingEur?: {
    basic?: number;
    standard?: number;
    complete?: number;
  };
};

export default function WebsitePage() {
  const webCatalog = commercialCatalog.professionalServices as Record<string, unknown>;
  const integratedWebsite = (webCatalog.integratedWebsite as IntegratedWebsiteCatalog | undefined) || null;
  const standaloneWebsite = (webCatalog.standaloneWebsite as StandaloneWebsiteCatalog | undefined) || null;

  return (
    <PageContainer
      title="Página web"
      description="Opciones para escalar desde la web básica incluida hasta una web optimizada para captación"
    >
      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Rocket className="h-5 w-5" />
          </div>
          <CardTitle>¿Tu escuela ya está convirtiendo visitas en matrículas?</CardTitle>
          <CardDescription>
            Si aún no tienes web optimizada, este es el siguiente salto para captar más alumnos sin aumentar tu carga operativa.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
              <Globe className="h-5 w-5" />
            </div>
            <CardTitle>{integratedWebsite?.label || "Web optimizada con Nexa"}</CardTitle>
            <CardDescription>
              {integratedWebsite?.shortDescription || "Web profesional conectada al sistema y orientada a conversión."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Starter: {formatEuro(integratedWebsite?.pricingByPlanEur?.starter ?? 1490)}</Badge>
              <Badge variant="secondary">Pro: {formatEuro(integratedWebsite?.pricingByPlanEur?.pro ?? 1790)}</Badge>
              <Badge variant="secondary">Enterprise: {formatEuro(integratedWebsite?.pricingByPlanEur?.enterprise ?? 2190)}</Badge>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {(integratedWebsite?.includes || []).slice(0, 4).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <Button asChild>
              <a href="mailto:hola@nexa.es?subject=Quiero%20informacion%20sobre%20web%20optimizada">
                Solicitar propuesta
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle>{standaloneWebsite?.label || "Web independiente"}</CardTitle>
            <CardDescription>
              {standaloneWebsite?.shortDescription || "Opción para presencia digital sin integración del sistema."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Basic: {formatEuro(standaloneWebsite?.tierPricingEur?.basic ?? 890)}</Badge>
              <Badge variant="outline">Standard: {formatEuro(standaloneWebsite?.tierPricingEur?.standard ?? 1290)}</Badge>
              <Badge variant="outline">Complete: {formatEuro(standaloneWebsite?.tierPricingEur?.complete ?? 2490)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Ideal para escuelas que quieren una web profesional hoy y planifican migración completa más adelante.
            </p>
            <Button variant="outline" asChild>
              <a href="mailto:hola@nexa.es?subject=Consulta%20web%20independiente">
                Consultar opción independiente
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
