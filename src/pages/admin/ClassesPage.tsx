import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ClassesPage() {
  return (
    <PageContainer
      title="Classes"
      description="Manage your class catalog"
      actions={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Class</Button>}
    >
      <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-sm">Classes management will be implemented in Sprint 6</p>
      </div>
    </PageContainer>
  );
}
