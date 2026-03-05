import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SchedulePage() {
  return (
    <PageContainer
      title="Schedule"
      description="Manage your weekly class schedule"
      actions={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Class</Button>}
    >
      <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">Schedule editor will be implemented in Sprint 5</p>
      </div>
    </PageContainer>
  );
}
