import { PageContainer } from "@/components/layout/PageContainer";

export default function AnalyticsPage() {
  return (
    <PageContainer title="Analíticas" description="Indicadores de rendimiento de la escuela">
      <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">El panel de analíticas se implementará en el Sprint 11</p>
      </div>
    </PageContainer>
  );
}
