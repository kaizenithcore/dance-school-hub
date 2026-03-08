import { EnrollmentRecord, EnrollmentStatus } from "@/lib/data/mockEnrollments";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, CreditCard, Clock, FileText, StickyNote, CheckCircle, XCircle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG: Record<EnrollmentStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-warning/15 text-warning border-warning/20" },
  confirmed: { label: "Aceptada", className: "bg-success/15 text-success border-success/20" },
  declined: { label: "Rechazada", className: "bg-destructive/15 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelada", className: "bg-muted text-muted-foreground border-border" },
};

interface EnrollmentDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: EnrollmentRecord | null;
  onChangeStatus: (id: string, status: EnrollmentStatus) => void;
}

export function EnrollmentDetailDrawer({ open, onOpenChange, enrollment, onChangeStatus }: EnrollmentDetailDrawerProps) {
  if (!enrollment) return null;

  const statusCfg = STATUS_CONFIG[enrollment.status];
  const isPending = enrollment.status === "pending";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Inscripción #{enrollment.id.replace("e", "")}</SheetTitle>
            <Badge variant="outline" className={cn("text-[10px] font-medium", statusCfg.className)}>
              {statusCfg.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Student info */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos del Alumno</h4>
            <div className="space-y-2.5">
              <InfoRow icon={Mail} label="Nombre" value={enrollment.studentName} />
              <InfoRow icon={Mail} label="Email" value={enrollment.studentEmail} />
              <InfoRow icon={Phone} label="Teléfono" value={enrollment.studentPhone} />
              <InfoRow icon={Calendar} label="Fecha de solicitud" value={format(new Date(enrollment.date), "d MMM yyyy", { locale: es })} />
              <InfoRow icon={CreditCard} label="Método de pago" value={enrollment.paymentMethod} />
            </div>
          </section>

          <Separator />

          {/* Classes */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Clases ({enrollment.classes.length})
            </h4>
            <div className="space-y-2">
              {enrollment.classes.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{cls.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{cls.day} · {cls.time}</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-foreground">€{cls.price}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-base font-bold text-primary">€{enrollment.totalPrice}</span>
              </div>
            </div>
          </section>

          {/* Attachments */}
          {enrollment.attachments && enrollment.attachments.length > 0 && (
            <>
              <Separator />
              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documentos Adjuntos</h4>
                <div className="space-y-1.5">
                  {enrollment.attachments.map((file) => (
                    <div key={file} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">{file}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Notes */}
          {enrollment.notes && (
            <>
              <Separator />
              <section className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" /> Notas
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-md p-3 border border-border">
                  {enrollment.notes}
                </p>
              </section>
            </>
          )}

          {/* Actions */}
          {isPending && (
            <>
              <Separator />
              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => onChangeStatus(enrollment.id, "confirmed")}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onChangeStatus(enrollment.id, "declined")}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onChangeStatus(enrollment.id, "cancelled")}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    Cancelar
                  </Button>
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
        <p className="text-sm text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
