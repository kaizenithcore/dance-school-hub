import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPortalAnalyticsKpiDefinitions,
  getSchoolPortalAnalytics,
  getSchoolPortalAnalyticsOverview,
  type PortalKpiDefinition,
  type PortalAnalyticsOverview,
  type PortalSchoolAnalytics,
} from "@/lib/api/portalFoundation";
import { toast } from "sonner";

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
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
        toast.error("No se pudieron cargar las analiticas");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <PageContainer
      title="Analiticas de Escuela"
      description="Actividad y engagement del ecosistema social"
    >
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
            <CardTitle>Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {loading ? "..." : `${(analytics.conversionRate * 100).toFixed(1)}%`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Ultima actividad: {analytics.lastActivityAt ? new Date(analytics.lastActivityAt).toLocaleString("es-ES") : "Sin datos"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement (30 dias)</CardTitle>
            <CardDescription>Interacciones en portal del alumno</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Vistas de feed: {loading ? "..." : overview?.engagement.views ?? 0}</p>
            <p>Likes: {loading ? "..." : overview?.engagement.likes ?? 0}</p>
            <p>Guardados: {loading ? "..." : overview?.engagement.saves ?? 0}</p>
            <p>Busquedas: {loading ? "..." : overview?.engagement.searches ?? 0}</p>
            <p className="text-foreground font-semibold">Rate: {loading ? "..." : `${overview?.engagement.engagementRate ?? 0}%`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funnel y Retencion</CardTitle>
            <CardDescription>Descubrimiento a matricula y riesgo de churn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Explorer views: {loading ? "..." : overview?.funnel.explorerViews ?? 0}</p>
            <p>Onboarding completado: {loading ? "..." : overview?.funnel.onboardingCompletions ?? 0}</p>
            <p>Matriculas iniciadas: {loading ? "..." : overview?.funnel.enrollmentStarts ?? 0}</p>
            <p>Matriculas completadas: {loading ? "..." : overview?.funnel.enrollmentCompletions ?? 0}</p>
            <p className="text-foreground font-semibold">Conversion: {loading ? "..." : `${overview?.funnel.conversionRate ?? 0}%`}</p>
            <p className="text-foreground font-semibold">Churn riesgo: {loading ? "..." : `${overview?.retention.churnRiskRate ?? 0}%`}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contrato KPI</CardTitle>
          <CardDescription>Definicion oficial de metricas, formula y ownership.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Cargando definiciones KPI...</p> : null}
          {!loading && kpis.length === 0 ? <p className="text-sm text-muted-foreground">Sin definiciones KPI.</p> : null}
          {kpis.map((kpi) => (
            <div key={kpi.key} className="rounded-md border p-3">
              <p className="text-sm font-semibold text-foreground">{kpi.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.formula}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span>Categoria: {kpi.category}</span>
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
