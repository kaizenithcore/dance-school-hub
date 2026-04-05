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
      description="Planificación clara para operar clases sin solapes"
      actions={<Button size="sm" onClick={() => navigate("/admin/classes")}>Gestionar clases</Button>}
    >
      <section className="mb-4 rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Menos gestión. Más control.</p>
        <p className="mt-1 text-xs text-muted-foreground">Visualiza disponibilidad, aplica propuestas y publica una planificación limpia.</p>
      </section>

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
