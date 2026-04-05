import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";
import { ScheduleInsightsPanel } from "@/components/schedule/ScheduleInsightsPanel";
import { ScheduleProposalsPanel } from "@/components/schedule/ScheduleProposalsPanel";
import { getScheduleInsights, type ScheduleInsightsResult, type ScheduleProposal } from "@/lib/api/schedules";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function SchedulePage() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<ScheduleInsightsResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [editorVersion, setEditorVersion] = useState(0);
  const [hoveredProposal, setHoveredProposal] = useState<ScheduleProposal | null>(null);

  const loadInsights = async () => {
    try {
      setLoadingInsights(true);
      const data = await getScheduleInsights();
      setInsights(data);
    } catch { setInsights(null); }
    finally { setLoadingInsights(false); }
  };

  useEffect(() => { void loadInsights(); }, []);

  return (
    <PageContainer
      title="Horarios"
      description="Planifica clases sin solapamientos"
      actions={<Button size="sm" onClick={() => navigate("/admin/classes")}>Gestionar clases</Button>}
    >
      <ScheduleInsightsPanel insights={insights} loading={loadingInsights} />
      <ScheduleEditor key={editorVersion} previewProposal={hoveredProposal} />
      <ScheduleProposalsPanel
        onPreviewChange={setHoveredProposal}
        onApplied={() => {
          setEditorVersion((prev) => prev + 1);
          setHoveredProposal(null);
          void loadInsights();
        }}
      />
    </PageContainer>
  );
}
