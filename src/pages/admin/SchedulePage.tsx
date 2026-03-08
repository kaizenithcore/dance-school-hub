import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";
import { ScheduleInsightsPanel } from "@/components/schedule/ScheduleInsightsPanel";
import { getScheduleInsights, type ScheduleInsightsResult } from "@/lib/api/schedules";

export default function SchedulePage() {
  const [insights, setInsights] = useState<ScheduleInsightsResult | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingInsights(true);
        const data = await getScheduleInsights();
        setInsights(data);
      } catch {
        setInsights(null);
      } finally {
        setLoadingInsights(false);
      }
    })();
  }, []);

  return (
    <PageContainer
      title="Horarios"
      description="Arrastra clases desde el panel lateral al calendario para armar el horario"
    >
      <div className="mb-4">
        <ScheduleInsightsPanel insights={insights} loading={loadingInsights} />
      </div>
      <ScheduleEditor />
    </PageContainer>
  );
}
