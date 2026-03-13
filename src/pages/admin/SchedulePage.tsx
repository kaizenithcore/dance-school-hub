import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";
import { ScheduleInsightsPanel } from "@/components/schedule/ScheduleInsightsPanel";
import { ScheduleProposalsPanel } from "@/components/schedule/ScheduleProposalsPanel";
import { getScheduleInsights, type ScheduleInsightsResult, type ScheduleProposal } from "@/lib/api/schedules";

export default function SchedulePage() {
  const [insights, setInsights] = useState<ScheduleInsightsResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [editorVersion, setEditorVersion] = useState(0);
  const [hoveredProposal, setHoveredProposal] = useState<ScheduleProposal | null>(null);

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
      <ScheduleEditor key={editorVersion} previewProposal={hoveredProposal} />
       <div className="mb-4">
        <ScheduleProposalsPanel
          onPreviewChange={setHoveredProposal}
          onApplied={() => {
            setEditorVersion((prev) => prev + 1);
            setHoveredProposal(null);
            void loadInsights();
          }}
        />
      </div>
    </PageContainer>
  );
}
