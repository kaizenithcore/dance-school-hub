import { PageContainer } from "@/components/layout/PageContainer";

export default function SettingsPage() {
  return (
    <PageContainer title="Settings" description="Configure your school">
      <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">Settings will be implemented in Sprint 12</p>
      </div>
    </PageContainer>
  );
}
