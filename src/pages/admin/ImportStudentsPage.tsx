import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { ImportWizard } from "@/components/import/ImportWizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ImportStudentsPage() {
  const navigate = useNavigate();

  return (
    <PageContainer
      title="Importar alumnos"
      description="Importa alumnos desde un archivo CSV o Excel con mapeo automático de columnas."
      actions={
        <Button size="sm" variant="outline" onClick={() => navigate("/admin/students")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a alumnos
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg border bg-card p-6">
          <ImportWizard onComplete={() => navigate("/admin/students")} />
        </div>
      </div>
    </PageContainer>
  );
}
