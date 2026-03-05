import { PageContainer } from "@/components/layout/PageContainer";

export default function EnrollmentsPage() {
  return (
    <PageContainer title="Enrollments" description="Review and manage enrollments">
      <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">Enrollment management will be implemented in Sprint 8</p>
      </div>
    </PageContainer>
  );
}
