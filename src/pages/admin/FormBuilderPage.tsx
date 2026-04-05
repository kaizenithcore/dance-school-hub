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
      <section className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Un solo objetivo: captar inscripciones completas</p>
        <p className="mt-1 text-xs text-muted-foreground">Prioriza campos clave, reduce fricción y revisa antes de publicar.</p>
      </section>

      <FormBuilder />
    </PageContainer>
  );
}
