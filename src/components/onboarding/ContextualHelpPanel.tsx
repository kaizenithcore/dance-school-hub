/**
 * ContextualHelpPanel — per-page sliding help panel.
 * Shows what the current page does, key actions, and a link back to the wizard.
 */
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ExternalLink, ChevronRight, CircleHelp,
  Users, GraduationCap, CalendarDays, CreditCard, Megaphone,
  Building2, Settings, Repeat, FileEdit, ClipboardList,
  ListOrdered, Wallet, Tags, DoorOpen, BookOpen, BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Per-page help content ─────────────────────────────────────────────────────

interface HelpAction {
  label: string;
  url?: string;
  onClick?: () => void;
  external?: boolean;
}

interface PageHelp {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  tips: string[];
  actions: HelpAction[];
}

const HELP_MAP: Array<{ prefix: string; help: PageHelp }> = [
  {
    prefix: "/admin/students/import",
    help: {
      title: "Importar alumnos",
      icon: Users,
      summary: "Sube un Excel o CSV con tu lista de alumnos y el sistema los importa automáticamente.",
      tips: [
        "El fichero debe tener al menos las columnas: Nombre y Email o Teléfono.",
        "Puedes descargar una plantilla de ejemplo antes de subir.",
        "Los alumnos importados quedan en estado Activo por defecto.",
      ],
      actions: [{ label: "Ver todos los alumnos", url: "/admin/students" }],
    },
  },
  {
    prefix: "/admin/students",
    help: {
      title: "Alumnos",
      icon: Users,
      summary: "Gestiona el listado completo de alumnos: fichas, contacto, inscripciones activas y estado de pagos.",
      tips: [
        "Usa el buscador para encontrar alumnos por nombre, email o DNI.",
        "Desde la ficha del alumno puedes ver sus clases, pagos e historial.",
        "El estado Inactivo oculta al alumno de las listas operativas.",
      ],
      actions: [
        { label: "Importar desde Excel", url: "/admin/students/import" },
        { label: "Ver inscripciones", url: "/admin/enrollments" },
      ],
    },
  },
  {
    prefix: "/admin/enrollments",
    help: {
      title: "Inscripciones (Matrículas)",
      icon: ClipboardList,
      summary: "Gestiona las solicitudes de matrícula: confirma, rechaza o cancela inscripciones de alumnos en clases.",
      tips: [
        "Una inscripción en estado Pendiente espera tu confirmación.",
        "Al confirmar, el alumno aparece en el listado de la clase.",
        "Puedes inscribir alumnos manualmente desde la ficha del alumno.",
      ],
      actions: [
        { label: "Ver alumnos", url: "/admin/students" },
        { label: "Ver clases", url: "/admin/classes" },
      ],
    },
  },
  {
    prefix: "/admin/schedule",
    help: {
      title: "Horario semanal",
      icon: CalendarDays,
      summary: "Vista de semana completa con todos los bloques horarios. Arrastra para reorganizar, añade nuevas franjas.",
      tips: [
        "Cada bloque representa una clase en un día y hora concretos.",
        "Los cambios de horario se reflejan inmediatamente en el portal del alumno.",
        "Puedes exportar el horario completo como PDF desde el botón de descarga.",
      ],
      actions: [
        { label: "Ver clases", url: "/admin/classes" },
        { label: "Clonar curso", url: "/admin/course-clone" },
      ],
    },
  },
  {
    prefix: "/admin/classes",
    help: {
      title: "Clases",
      icon: GraduationCap,
      summary: "Catálogo de todas las clases de la escuela: nombre, disciplina, profesor, sala y número de alumnos.",
      tips: [
        "Crea clases aquí y configura sus horarios en la vista 'Horario semanal'.",
        "Asigna un profesor a cada clase para que aparezca en el portal.",
        "El precio de la clase se usa en las facturas y recibos.",
      ],
      actions: [
        { label: "Ver horario semanal", url: "/admin/schedule" },
        { label: "Gestionar profesores", url: "/admin/teachers" },
      ],
    },
  },
  {
    prefix: "/admin/teachers",
    help: {
      title: "Profesores",
      icon: BookOpen,
      summary: "Directorio de profesores con sus clases asignadas, contacto y salario mensual.",
      tips: [
        "Asigna clases al profesor desde su ficha o desde la edición de la clase.",
        "El salario mensual se usa en el módulo de Economía para calcular gastos.",
        "Un profesor inactivo no aparece en los horarios del portal.",
      ],
      actions: [{ label: "Ver clases", url: "/admin/classes" }],
    },
  },
  {
    prefix: "/admin/rooms",
    help: {
      title: "Aulas",
      icon: DoorOpen,
      summary: "Gestiona las salas y espacios de la academia con su capacidad y disponibilidad.",
      tips: [
        "La capacidad de un aula limita el número de alumnos por clase.",
        "Asigna aulas a las clases desde la edición de clase o del horario.",
      ],
      actions: [{ label: "Ver horario", url: "/admin/schedule" }],
    },
  },
  {
    prefix: "/admin/payments",
    help: {
      title: "Pagos",
      icon: CreditCard,
      summary: "Registro de cobros, facturas y recibos. Controla qué alumnos han pagado y cuáles están pendientes.",
      tips: [
        "Genera facturas mensuales con un clic para todos los alumnos activos.",
        "Descarga recibos en PDF individuales o en lote para imprimir.",
        "Registra pagos manuales (efectivo, transferencia) desde el botón 'Registrar pago'.",
      ],
      actions: [
        { label: "Ver alumnos con deuda", url: "/admin/payments?filter=pending" },
        { label: "Ver economía", url: "/admin/economia" },
      ],
    },
  },
  {
    prefix: "/admin/economia",
    help: {
      title: "Economía",
      icon: Wallet,
      summary: "Vista financiera rápida: ingresos, gastos (salarios + extras) y balance mensual.",
      tips: [
        "Los ingresos se calculan automáticamente de los pagos confirmados.",
        "Los gastos incluyen los salarios de profesores que hayas configurado.",
        "Añade ingresos o gastos manuales para eventos, materiales, etc.",
      ],
      actions: [{ label: "Ver pagos", url: "/admin/payments" }],
    },
  },
  {
    prefix: "/admin/pricing",
    help: {
      title: "Tarifas y paquetes",
      icon: Tags,
      summary: "Define los precios de clases individuales, bonos y paquetes combinados por disciplina.",
      tips: [
        "Las 'Tarifas' son precios por clase o tipo de servicio.",
        "Los 'Paquetes' agrupan varias disciplinas para ofrecer descuento combinado.",
        "Los precios configurados aquí se aplican automáticamente en las inscripciones.",
      ],
      actions: [{ label: "Ver clases", url: "/admin/classes" }],
    },
  },
  {
    prefix: "/admin/waitlist",
    help: {
      title: "Lista de espera",
      icon: ListOrdered,
      summary: "Alumnos interesados en una clase que ya no tiene plazas disponibles.",
      tips: [
        "Cuando se libera una plaza, el primer alumno en lista recibe una notificación.",
        "Puedes inscribir manualmente a cualquier alumno de la lista.",
        "La lista de espera pública se activa desde el formulario de matrícula.",
      ],
      actions: [{ label: "Ver inscripciones", url: "/admin/enrollments" }],
    },
  },
  {
    prefix: "/admin/renewals",
    help: {
      title: "Renovación de alumnos",
      icon: Repeat,
      summary: "Gestiona la renovación de plaza del curso actual al siguiente. Envía emails personalizados con el horario.",
      tips: [
        "Inicia la renovación indicando el curso de origen y el de destino.",
        "El email incluye una tabla con el horario del próximo curso.",
        "El alumno confirma o rechaza cada clase individualmente desde el enlace del email.",
      ],
      actions: [
        { label: "Clonar curso", url: "/admin/course-clone" },
        { label: "Ver alumnos", url: "/admin/students" },
      ],
    },
  },
  {
    prefix: "/admin/communications",
    help: {
      title: "Comunicados",
      icon: Megaphone,
      summary: "Envía emails o WhatsApp a segmentos de alumnos: toda la escuela, una clase específica o una disciplina.",
      tips: [
        "Usa 'Ver destinatarios' para comprobar a cuántos alumnos llegará antes de enviar.",
        "El historial de envíos muestra el estado de entrega por destinatario.",
        "'Enviar pendientes' procesa los mensajes que están en cola.",
      ],
      actions: [{ label: "Ver alumnos", url: "/admin/students" }],
    },
  },
  {
    prefix: "/admin/form-builder",
    help: {
      title: "Formulario de matrícula",
      icon: FileEdit,
      summary: "Diseña el formulario público de inscripción que verán los nuevos alumnos.",
      tips: [
        "Añade, elimina y reordena campos según la información que necesitas.",
        "El enlace público del formulario se comparte en redes o web.",
        "Las respuestas llegan como solicitudes de inscripción en 'Matrículas'.",
      ],
      actions: [
        { label: "Ver inscripciones", url: "/admin/enrollments" },
        { label: "Ver portal web", url: "/admin/website" },
      ],
    },
  },
  {
    prefix: "/admin/course-clone",
    help: {
      title: "Clonar curso",
      icon: GraduationCap,
      summary: "Duplica todas las clases y horarios de un curso académico al siguiente en un clic.",
      tips: [
        "Solo se copian clases y horarios — los alumnos y pagos no se duplican.",
        "Las clases clonadas se crean en el año académico de destino.",
        "Tras clonar, revisa los horarios del nuevo curso en 'Horario semanal'.",
      ],
      actions: [{ label: "Ver horario", url: "/admin/schedule" }],
    },
  },
  {
    prefix: "/admin/settings",
    help: {
      title: "Configuración",
      icon: Settings,
      summary: "Ajustes operativos de la escuela: datos, branding, cobros, acceso y plan de suscripción.",
      tips: [
        "En 'Branding' puedes subir tu logo y cambiar los colores de la escuela.",
        "En 'Cobros' configura métodos de pago y día de vencimiento.",
        "En 'Plan' puedes actualizar tu suscripción cuando el trial expire.",
      ],
      actions: [
        { label: "Branding", url: "/admin/settings/branding" },
        { label: "Plan", url: "/admin/settings/plan" },
      ],
    },
  },
  {
    prefix: "/admin",
    help: {
      title: "Panel principal",
      icon: BarChart2,
      summary: "Vista operativa con el estado diario de tu escuela: clases de hoy, pagos pendientes y acciones rápidas.",
      tips: [
        "Las tarjetas de métricas muestran el estado actual de alumnos, pagos y clases.",
        "Usa los accesos directos para las tareas más habituales del día.",
        "El panel se actualiza con datos reales de tu escuela.",
      ],
      actions: [
        { label: "Ver alumnos", url: "/admin/students" },
        { label: "Ver pagos", url: "/admin/payments" },
      ],
    },
  },
];

function getHelp(pathname: string): PageHelp | null {
  // Match most-specific prefix first
  const sorted = [...HELP_MAP].sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((h) => pathname.startsWith(h.prefix))?.help ?? null;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ContextualHelpPanelProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
  onOpenWizard: () => void;
  wizardFinished: boolean;
}

export function ContextualHelpPanel({ open, onClose, pathname, onOpenWizard, wizardFinished }: ContextualHelpPanelProps) {
  const navigate = useNavigate();
  const help = getHelp(pathname);
  const Icon = help?.icon ?? CircleHelp;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop (transparent — click outside closes) */}
          <div className="fixed inset-0 z-[60]" onClick={onClose} />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-80 bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{help?.title ?? "Ayuda"}</p>
                  <p className="text-[10px] text-muted-foreground">Guía rápida</p>
                </div>
              </div>
              <button type="button" onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {help ? (
                <>
                  {/* Summary */}
                  <p className="text-sm text-muted-foreground leading-relaxed">{help.summary}</p>

                  {/* Tips */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Consejos</p>
                    {help.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">{i + 1}</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  {help.actions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Acciones rápidas</p>
                      {help.actions.map((a) => (
                        <button key={a.label} type="button"
                          onClick={() => { if (a.url) { navigate(a.url); onClose(); } else a.onClick?.(); }}
                          className="w-full flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-accent/40 transition-colors">
                          <span className="flex-1">{a.label}</span>
                          {a.external ? <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No hay ayuda específica para esta sección.</p>
              )}
            </div>

            {/* Footer — wizard CTA */}
            <div className="border-t border-border p-4 space-y-2">
              {!wizardFinished && (
                <Button variant="default" size="sm" className="w-full" onClick={() => { onOpenWizard(); onClose(); }}>
                  ✦ Retomar configuración inicial
                </Button>
              )}
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { navigate("/admin/settings"); onClose(); }}>
                <Settings className="h-3.5 w-3.5 mr-1.5" /> Ir a configuración
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
