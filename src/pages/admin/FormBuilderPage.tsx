import { PageContainer } from "@/components/layout/PageContainer";
import { FormBuilder } from "@/components/form-builder/FormBuilder";
import { ModuleHelpShortcut } from "@/components/layout/ModuleHelpShortcut";

export default function FormBuilderPage() {
  return (
    <PageContainer
      title="Editor de Formulario de Matrícula"
      description="Diseñá el formulario que los alumnos completarán para inscribirse"
      actions={<ModuleHelpShortcut module="form-builder" />}
    >
      <FormBuilder />
    </PageContainer>
  );
}
