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
      description="Elige el formato web que mejor acompaña tu fase de crecimiento"
    >
      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Rocket className="h-5 w-5" />
          </div>
          <CardTitle>Convierte tu web en tu mejor canal de matrícula</CardTitle>
          <CardDescription>
            Prioriza una presencia digital con foco comercial: mejor mensaje, mejor estructura y más solicitudes cualificadas.
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
              {integratedWebsite?.shortDescription || "Web conectada a Nexa para unir captación, seguimiento y matrícula."}
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
                Solicitar diagnóstico
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
              {standaloneWebsite?.shortDescription || "Opción web profesional para escuelas que aún no integran toda la operación en Nexa."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Basic: {formatEuro(standaloneWebsite?.tierPricingEur?.basic ?? 890)}</Badge>
              <Badge variant="outline">Standard: {formatEuro(standaloneWebsite?.tierPricingEur?.standard ?? 1290)}</Badge>
              <Badge variant="outline">Complete: {formatEuro(standaloneWebsite?.tierPricingEur?.complete ?? 2490)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Recomendado si necesitas una web comercial ahora y prefieres integrar el sistema por fases.
            </p>
            <Button variant="outline" asChild>
              <a href="mailto:hola@nexa.es?subject=Consulta%20web%20independiente">
                Pedir propuesta independiente
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
