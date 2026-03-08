import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";
import { ScheduleInsightsPanel } from "@/components/schedule/ScheduleInsightsPanel";
import { ScheduleProposalsPanel } from "@/components/schedule/ScheduleProposalsPanel";
import { getScheduleInsights, type ScheduleInsightsResult } from "@/lib/api/schedules";

export default function SchedulePage() {
  const [insights, setInsights] = useState<ScheduleInsightsResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [editorVersion, setEditorVersion] = useState(0);

  const loadInsights = async () => {
    try {
      setLoadingInsights(true);
      const data = await getScheduleInsights();
      setInsights(data);
    } catch {
      setInsights(null);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    void loadInsights();
  }, []);

  return (
    <PageContainer
      title="Horarios"
      description="Arrastra clases desde el panel lateral al calendario para armar el horario"
    >
      <div className="mb-4">
        <ScheduleInsightsPanel insights={insights} loading={loadingInsights} />
      </div>
      <div className="mb-4">
        <ScheduleProposalsPanel
          onApplied={() => {
            setEditorVersion((prev) => prev + 1);
            void loadInsights();
          }}
        />
      </div>
      <ScheduleEditor key={editorVersion} />
    </PageContainer>
  );
}
