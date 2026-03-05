import { PageContainer } from "@/components/layout/PageContainer";

export default function SettingsPage() {
  return (
    <PageContainer title="Configuración" description="Configura tu escuela">
      <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">La configuración se implementará en el Sprint 12</p>
      </div>
    </PageContainer>
  );
}
