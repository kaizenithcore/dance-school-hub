import { PageContainer } from "@/components/layout/PageContainer";
import { FormBuilder } from "@/components/form-builder/FormBuilder";
import { ModuleHelpShortcut } from "@/components/layout/ModuleHelpShortcut";

export default function FormBuilderPage() {
  return (
    <PageContainer
      title="Matrícula online"
      description="Flujo simple de inscripción para convertir más y corregir menos"
      actions={<ModuleHelpShortcut module="form-builder" />}
    >
      <FormBuilder />
    </PageContainer>
  );
}
