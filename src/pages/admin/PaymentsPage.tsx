import { PageContainer } from "@/components/layout/PageContainer";

export default function PaymentsPage() {
  return (
    <PageContainer title="Payments" description="Track and manage payments">
      <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">Payment management will be implemented in Sprint 9</p>
      </div>
    </PageContainer>
  );
}
