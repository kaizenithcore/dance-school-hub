import { ClassCardData } from "@/components/cards/ClassCard";
import { Repeat, CalendarDays, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnrollmentSummaryProps {
  selectedClasses: ClassCardData[];
  onRemoveClass: (id: string) => void;
  discount?: { label: string; amount: number };
}

export function EnrollmentSummary({ selectedClasses, onRemoveClass, discount }: EnrollmentSummaryProps) {
  const subtotal = selectedClasses.reduce((sum, c) => sum + c.price, 0);
  const discountAmount = discount?.amount || 0;
  const total = subtotal - discountAmount;

  if (selectedClasses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">No hay clases seleccionadas.</p>
        <p className="text-xs text-muted-foreground mt-1">Volvé al horario para elegir tus clases.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-soft overflow-hidden">
      <div className="p-5">
        <h3 className="text-base font-semibold text-foreground mb-4">Resumen de Inscripción</h3>

        <div className="space-y-3">
          {selectedClasses.map((cls) => (
            <div key={cls.id} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{cls.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{cls.day} · {cls.time}</span>
                  {cls.recurrence === "weekly" ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Repeat className="h-2.5 w-2.5" /> Semanal
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      <CalendarDays className="h-2.5 w-2.5" /> {cls.date}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">${cls.price}</span>
              <button
                type="button"
                onClick={() => onRemoveClass(cls.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 p-5 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>${subtotal}</span>
        </div>
        {discount && discountAmount > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>{discount.label}</span>
            <span>-${discountAmount}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold text-foreground pt-1 border-t border-border">
          <span>Total</span>
          <span>${total}</span>
        </div>
      </div>
    </div>
  );
}
