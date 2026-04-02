import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModuleHelpShortcut } from "@/components/layout/ModuleHelpShortcut";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getPortalAnalyticsKpiDefinitions,
  getSchoolPortalAnalytics,
  getSchoolPortalAnalyticsOverview,
  type PortalKpiDefinition,
  type PortalAnalyticsOverview,
  type PortalSchoolAnalytics,
} from "@/lib/api/portalFoundation";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { toastErrorOnce } from "@/lib/toastPremium";

const emptyAnalytics: PortalSchoolAnalytics = {
  studentsCount: 0,
  activeClassesCount: 0,
  postsCount: 0,
  eventsCount: 0,
  followersCount: 0,
  viewsCount: 0,
  conversionRate: 0,
  lastActivityAt: null,
};

export default function SchoolAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<PortalSchoolAnalytics>(emptyAnalytics);
  const [overview, setOverview] = useState<PortalAnalyticsOverview | null>(null);
  const [kpis, setKpis] = useState<PortalKpiDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [data, advanced, kpiContract] = await Promise.all([
        getSchoolPortalAnalytics(),
        getSchoolPortalAnalyticsOverview(30),
        getPortalAnalyticsKpiDefinitions(),
      ]);
      setAnalytics(data);
      setOverview(advanced);
      setKpis(kpiContract.kpis);
    } catch (error) {
      console.error(error);
      const message = "No se pudieron cargar las analíticas";
      setLoadError(message);
      toastErrorOnce("school-analytics-load", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  return (
    <PageContainer
      title="Analíticas de Escuela"
      description="Actividad y engagement del ecosistema social"
      actions={
        <>
          <ModuleHelpShortcut module="school-analytics" />
          <Button variant="outline" onClick={() => void loadAnalytics()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Recargar</span>
          </Button>
        </>
      }
    >
      {loadError ? (
        <Card>
          <CardContent>
            <EmptyState
              type="error"
              title="Analíticas no disponibles"
              description={loadError}
              actionLabel="Reintentar"
              onAction={() => void loadAnalytics()}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Alumnos</CardTitle>
            <CardDescription>Total de alumnos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{loading ? "..." : analytics.studentsCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clases activas</CardTitle>
            <CardDescription>Oferta académica vigente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{loading ? "..." : analytics.activeClassesCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publicaciones</CardTitle>
            <CardDescription>Contenido publicado en feed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{loading ? "..." : analytics.postsCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos</CardTitle>
            <CardDescription>Eventos creados por la escuela</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{loading ? "..." : analytics.eventsCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Seguidores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{loading ? "..." : analytics.followersCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Visitas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{loading ? "..." : analytics.viewsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Conversión</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {loading ? "..." : `${(analytics.conversionRate * 100).toFixed(1)}%`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Última actividad: {analytics.lastActivityAt ? new Date(analytics.lastActivityAt).toLocaleString("es-ES") : "Sin datos"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement (30 días)</CardTitle>
            <CardDescription>Interacciones en portal del alumno</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Vistas de feed: {loading ? "..." : overview?.engagement.views ?? 0}</p>
            <p>Likes: {loading ? "..." : overview?.engagement.likes ?? 0}</p>
            <p>Guardados: {loading ? "..." : overview?.engagement.saves ?? 0}</p>
            <p>Búsquedas: {loading ? "..." : overview?.engagement.searches ?? 0}</p>
            <p className="text-foreground font-semibold">Rate: {loading ? "..." : `${overview?.engagement.engagementRate ?? 0}%`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funnel y Retención</CardTitle>
            <CardDescription>Descubrimiento a matrícula y riesgo de churn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Explorer views: {loading ? "..." : overview?.funnel.explorerViews ?? 0}</p>
            <p>Onboarding completado: {loading ? "..." : overview?.funnel.onboardingCompletions ?? 0}</p>
            <p>Matrículas iniciadas: {loading ? "..." : overview?.funnel.enrollmentStarts ?? 0}</p>
            <p>Matrículas completadas: {loading ? "..." : overview?.funnel.enrollmentCompletions ?? 0}</p>
            <p className="text-foreground font-semibold">Conversión: {loading ? "..." : `${overview?.funnel.conversionRate ?? 0}%`}</p>
            <p className="text-foreground font-semibold">Churn riesgo: {loading ? "..." : `${overview?.retention.churnRiskRate ?? 0}%`}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contrato KPI</CardTitle>
          <CardDescription>Definición oficial de métricas, fórmula y ownership.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <EmptyState
              title="Cargando contrato KPI"
              description="Estamos sincronizando definiciones para mostrar métricas confiables."
            />
          ) : null}
          {!loading && kpis.length === 0 ? (
            <EmptyState
              title="Sin definiciones KPI"
              description="Aún no hay contrato de métricas publicado para esta escuela."
              actionLabel="Reintentar"
              onAction={() => void loadAnalytics()}
            />
          ) : null}
          {kpis.map((kpi) => (
            <div key={kpi.key} className="rounded-md border p-3">
              <p className="text-sm font-semibold text-foreground">{kpi.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.formula}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span>Categoría: {kpi.category}</span>
                <span>Frecuencia: {kpi.frequency}</span>
                <span>Owner: {kpi.owner}</span>
                <span>Target: {kpi.target}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
