import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { getModuleEntry } from "@/lib/moduleLifecyclePolicy";
import { Button } from "@/components/ui/button";

interface ModuleDisabledPageProps {
  moduleKey?: string;
}

function resolveModuleKey(rawValue: string | null | undefined): string {
  if (!rawValue) return "exams";
  return rawValue;
}

export default function ModuleDisabledPage({ moduleKey }: ModuleDisabledPageProps) {
  const [searchParams] = useSearchParams();

  const resolvedModuleKey = resolveModuleKey(moduleKey ?? searchParams.get("module"));
  const entry = useMemo(() => getModuleEntry(resolvedModuleKey), [resolvedModuleKey]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" aria-hidden="true" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Módulo fuera del MVP</h1>
            <p className="text-sm text-muted-foreground">
              Este módulo se retiró del flujo principal del MVP y no está operativo en esta fase.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
          <p><strong>Módulo:</strong> {resolvedModuleKey}</p>
          <p><strong>Estado:</strong> {entry?.status ?? "desconocido"}</p>
          <p><strong>Motivo:</strong> {entry?.reason ?? "No especificado"}</p>
          <p><strong>Owner:</strong> {entry?.owner ?? "-"}</p>
          <p><strong>Fecha de desactivación:</strong> {entry?.disabledSince ?? "-"}</p>
          <p><strong>Revisión:</strong> {entry?.reviewAfter ?? "-"}</p>
          <p><strong>Alternativa MVP:</strong> {entry?.replacement ?? "Operativa core disponible"}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/admin">Volver al panel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/settings">Ver configuración</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
