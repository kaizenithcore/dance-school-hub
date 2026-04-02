import { Link } from "react-router-dom";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type AdminModuleHelpKey =
  | "form-builder"
  | "economia"
  | "renewals"
  | "course-clone"
  | "events"
  | "exams"
  | "reception"
  | "school-analytics"
  | "school-posts";

const HELP_MAP: Record<AdminModuleHelpKey, { href: string; tooltip: string; label?: string }> = {
  "form-builder": {
    href: "/guides/matricula-5-minutos",
    tooltip: "Guía rápida para diseñar y publicar tu formulario.",
    label: "Ayuda",
  },
  economia: {
    href: "/guides/cobros-vencidos-reducir-impagos",
    tooltip: "Pasos para ordenar cobros, impagos y movimientos.",
    label: "Ayuda",
  },
  renewals: {
    href: "/guides/automatizar-renovaciones",
    tooltip: "Atajo para crear campañas y confirmar propuestas.",
    label: "Ayuda",
  },
  "course-clone": {
    href: "/guides/organizar-horario-curso",
    tooltip: "Cómo simular y duplicar periodos sin errores.",
    label: "Ayuda",
  },
  events: {
    href: "/guides",
    tooltip: "Abre las guías para flujos de gestión y comunicación.",
    label: "Ayuda",
  },
  exams: {
    href: "/guides",
    tooltip: "Revisa buenas prácticas para convocatorias y operación.",
    label: "Ayuda",
  },
  reception: {
    href: "/guides",
    tooltip: "Atajos operativos para atención diaria en recepción.",
    label: "Ayuda",
  },
  "school-analytics": {
    href: "/guides",
    tooltip: "Claves para interpretar KPIs y métricas del portal.",
    label: "Ayuda",
  },
  "school-posts": {
    href: "/guides",
    tooltip: "Recomendaciones para publicar y moderar contenido.",
    label: "Ayuda",
  },
};

interface ModuleHelpShortcutProps {
  module: AdminModuleHelpKey;
}

export function ModuleHelpShortcut({ module }: ModuleHelpShortcutProps) {
  const help = HELP_MAP[module];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="sm" aria-label={help.tooltip}>
          <Link to={help.href}>
            <CircleHelp className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">{help.label || "Ayuda"}</span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{help.tooltip}</TooltipContent>
    </Tooltip>
  );
}
