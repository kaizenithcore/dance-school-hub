import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const guides = [
  {
    title: "Como crear tu matricula en 5 minutos",
    description: "Configura un formulario claro y publícalo para familias sin depender de soporte tecnico.",
    to: "/guides/matricula-5-minutos",
  },
  {
    title: "Como organizar el horario de todo el curso",
    description: "Ordena clases, salas y profesores con un proceso simple para evitar conflictos.",
    to: "/guides/organizar-horario-curso",
  },
  {
    title: "Como automatizar renovaciones de alumnos",
    description: "Ejecuta una campana de renovacion y controla el estado de cada familia en un solo flujo.",
    to: "/guides/automatizar-renovaciones",
  },
  {
    title: "Como gestionar lista de espera sin llamadas",
    description: "Mantiene orden cuando una clase se completa y asigna plazas libres con menos seguimiento manual.",
    to: "/guides/lista-espera-sin-llamadas",
  },
  {
    title: "Como controlar cobros vencidos y reducir impagos",
    description: "Estandariza la rutina de cobros para cerrar el mes con menos incidencias.",
    to: "/guides/cobros-vencidos-reducir-impagos",
  },
];

export default function GuidesIndexPage() {
  return (
    <section>
      <p className="text-sm font-semibold text-primary uppercase tracking-wide">Centro de guias</p>
      <h1 className="mt-2 text-3xl font-bold">Procedimientos simples para administracion</h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        Estas guias estan escritas para personal administrativo. Cada una incluye pasos claros, revisiones basicas y resultados esperados.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.to}
            to={guide.to}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <h2 className="text-base font-semibold">{guide.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{guide.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Abrir guia <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
