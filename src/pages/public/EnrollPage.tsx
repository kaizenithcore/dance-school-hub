import { useParams } from "react-router-dom";

export default function EnrollPage() {
  return (
    <div className="container py-12 sm:py-16 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground">Inscripción</h1>
        <p className="mt-1 text-sm text-muted-foreground mb-8">
          Completá el formulario a continuación para inscribirte en las clases.
        </p>
        <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground text-sm">
            El formulario de inscripción dinámico se implementará en el Sprint 4
          </p>
        </div>
      </div>
    </div>
  );
}
