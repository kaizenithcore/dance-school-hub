import { PageContainer } from "@/components/layout/PageContainer";

export default function PaymentsPage() {
  return (
    <PageContainer title="Pagos" description="Seguimiento y gestión de pagos">
      <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">La gestión de pagos se implementará en el Sprint 9</p>
      </div>
    </PageContainer>
  );
}
