import { PageContainer } from "@/components/layout/PageContainer";
import { FormBuilder } from "@/components/form-builder/FormBuilder";

export default function FormBuilderPage() {
  return (
    <PageContainer
      title="Editor de Formulario de Matrícula"
      description="Diseñá el formulario que los alumnos completarán para inscribirse"
    >
      <FormBuilder />
    </PageContainer>
  );
}
