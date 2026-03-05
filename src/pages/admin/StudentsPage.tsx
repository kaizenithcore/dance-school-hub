import { PageContainer } from "@/components/layout/PageContainer";

export default function StudentsPage() {
  return (
    <PageContainer title="Alumnos" description="Gestiona los registros de alumnos">
      <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">La gestión de alumnos se implementará en el Sprint 7</p>
      </div>
    </PageContainer>
  );
}
