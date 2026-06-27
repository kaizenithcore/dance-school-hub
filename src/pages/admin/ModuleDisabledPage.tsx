import { Link, useSearchParams } from "react-router-dom";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODULE_LABELS: Record<string, { name: string; description: string }> = {
  analytics:      { name: "Analíticas avanzadas",    description: "Las métricas detalladas de rendimiento de la academia estarán disponibles en una próxima versión." },
  events:         { name: "Gestión de eventos",       description: "La gestión avanzada de festivales, exhibiciones y competiciones llegará próximamente." },
  "course-clone": { name: "Clonar temporadas",        description: "La herramienta para duplicar la programación de un curso a otro estará disponible próximamente." },
};

const DEFAULT_INFO = { name: "Esta funcionalidad", description: "Esta sección no está disponible en la versión actual del producto." };

interface ModuleDisabledPageProps {
  moduleKey?: string;
}

export default function ModuleDisabledPage({ moduleKey }: ModuleDisabledPageProps) {
  const [searchParams] = useSearchParams();
  const key = moduleKey ?? searchParams.get("module") ?? "";
  const info = MODULE_LABELS[key] ?? DEFAULT_INFO;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Clock className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">{info.name}</h1>
      <p className="mt-3 text-muted-foreground max-w-sm mx-auto">{info.description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/admin">Volver al panel</Link>
        </Button>
      </div>
    </div>
  );
}
