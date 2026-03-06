import { PaymentRecord, PaymentStatus } from "@/lib/data/mockPayments";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, CreditCard, FileText, StickyNote, CheckCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Pagado", className: "bg-success/15 text-success border-success/20" },
  pending: { label: "Pendiente", className: "bg-warning/15 text-warning border-warning/20" },
  overdue: { label: "Vencido", className: "bg-destructive/15 text-destructive border-destructive/20" },
  refunded: { label: "Reembolsado", className: "bg-info/15 text-info border-info/20" },
};

interface PaymentDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentRecord | null;
  onMarkPaid: (id: string) => void;
  onMarkRefunded: (id: string) => void;
}

export function PaymentDetailDrawer({ open, onOpenChange, payment, onMarkPaid, onMarkRefunded }: PaymentDetailDrawerProps) {
  if (!payment) return null;

  const statusCfg = STATUS_CONFIG[payment.status];
  const canMarkPaid = payment.status === "pending" || payment.status === "overdue";
  const canRefund = payment.status === "paid";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Pago #{payment.id.replace("p", "")}</SheetTitle>
            <Badge variant="outline" className={cn("text-[10px] font-medium", statusCfg.className)}>
              {statusCfg.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Student */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos del Alumno</h4>
            <div className="space-y-2.5">
              <InfoRow icon={Mail} label="Nombre" value={payment.studentName} />
              <InfoRow icon={Mail} label="Email" value={payment.studentEmail} />
            </div>
          </section>

          <Separator />

          {/* Payment details */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalle del Pago</h4>
            <div className="space-y-2.5">
              <InfoRow icon={FileText} label="Concepto" value={payment.concept} />
              <InfoRow icon={Calendar} label="Período" value={format(new Date(payment.month + "-01"), "MMMM yyyy", { locale: es })} />
              <InfoRow icon={Calendar} label="Fecha de registro" value={format(new Date(payment.date), "d MMM yyyy", { locale: es })} />
              <InfoRow icon={CreditCard} label="Método de pago" value={payment.method} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm font-semibold text-foreground">Monto</span>
              <span className="text-lg font-bold text-primary">${payment.amount.toLocaleString()}</span>
            </div>
          </section>

          {/* Notes */}
          {payment.notes && (
            <>
              <Separator />
              <section className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" /> Notas
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-md p-3 border border-border">
                  {payment.notes}
                </p>
              </section>
            </>
          )}

          {/* Actions */}
          {(canMarkPaid || canRefund) && (
            <>
              <Separator />
              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</h4>
                <div className="flex flex-wrap gap-2">
                  {canMarkPaid && (
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => onMarkPaid(payment.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Marcar como Pagado
                    </Button>
                  )}
                  {canRefund && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMarkRefunded(payment.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reembolsar
                    </Button>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
