import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  Receipt,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOUR_STEPS = [
  {
    Icon: CalendarDays,
    iconClass: "text-blue-500",
    title: "Horarios visuales",
    description:
      "Vista semanal intuitiva. Tus alumnos consultan y reservan clases desde el móvil, sin emails ni llamadas.",
  },
  {
    Icon: ClipboardList,
    iconClass: "text-green-500",
    title: "Matrícula online",
    description:
      "Formulario personalizable. Las inscripciones llegan solas — sin papel, sin WhatsApp, sin errores.",
  },
  {
    Icon: Receipt,
    iconClass: "text-violet-500",
    title: "Cobros y recibos",
    description:
      "Genera recibos automáticos, controla el estado de cada pago y envía recordatorios con un clic.",
  },
  {
    Icon: MessageSquare,
    iconClass: "text-orange-500",
    title: "Comunicación con familias",
    description:
      "Envía avisos, cambios de aula o novedades a toda tu escuela al instante.",
  },
] as const;

const DELAY_MS = 4000;

export function DemoTourCard() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || !visible) return null;

  const isLastStep = step === TOUR_STEPS.length - 1;
  const { Icon, iconClass, title, description } = TOUR_STEPS[step];

  return (
    <div className="fixed bottom-5 right-5 z-40 w-80 rounded-xl border border-border bg-card shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tour · {step + 1}/{TOUR_STEPS.length}
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-sm p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Cerrar tour"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 px-4 pb-3">
        {TOUR_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            aria-label={`Ir al paso ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === step ? "bg-primary w-4" : "bg-muted-foreground/30 w-1.5",
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn("mt-0.5 shrink-0", iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            aria-label="Paso anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {isLastStep ? (
            <Button size="sm" className="flex-1 h-7 text-xs font-semibold" asChild>
              <Link to="/auth/register">
                Crea tu escuela gratis
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={() => setStep((s) => s + 1)}
            >
              Siguiente
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
