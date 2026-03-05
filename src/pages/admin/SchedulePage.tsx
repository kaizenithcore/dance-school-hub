import { PageContainer } from "@/components/layout/PageContainer";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";

export default function SchedulePage() {
  return (
    <PageContainer
      title="Horarios"
      description="Arrastrá clases desde el panel lateral al calendario para armar el horario"
    >
      <ScheduleEditor />
    </PageContainer>
  );
}
