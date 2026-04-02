import { StudentRecord } from "@/lib/data/mockStudents";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, GraduationCap, Clock, User, Shield, StickyNote, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { SchoolStudentField } from "@/lib/api/studentFields";

const PAYMENT_LABELS: Record<string, string> = {
  monthly: "Mensual",
  per_class: "Por clase",
  none: "Sin pago",
};

interface StudentProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentRecord | null;
  customFields?: SchoolStudentField[];
}

function formatCustomFieldValue(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "string") return value.trim() || "-";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function StudentProfileDrawer({ open, onOpenChange, student, customFields = [] }: StudentProfileDrawerProps) {
  if (!student) return null;

  const age = new Date().getFullYear() - new Date(student.birthdate).getFullYear();
  const isMinor = age < 18;
  const statusLabel = student.status === "active" ? "Activo" : "Inactivo";
  const statusClass = student.status === "active"
    ? "bg-success/15 text-success border-success/20"
    : "bg-muted text-muted-foreground border-border";

  const monthlyTotal = student.paymentType === "monthly"
    ? (typeof student.monthlyTotalOverride === "number"
      ? student.monthlyTotalOverride
      : student.enrolledClasses.reduce((sum, c) => sum + c.monthlyPrice, 0))
    : null;

  const visibleCustomFields = customFields.filter((field) => field.visible);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-lg font-semibold">
              {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg">{student.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn("text-[10px]", statusClass)}>{statusLabel}</Badge>
                {isMinor && (
                  <Badge variant="outline" className="text-[10px] bg-info/15 text-info border-info/20">Menor</Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos de Contacto</h4>
            <div className="space-y-2.5">
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Teléfono" value={student.phone} />
                    <InfoRow icon={Calendar} label="Localidad" value={student.locality || "-"} />
                    <InfoRow icon={Calendar} label="Domicilio" value={student.address || "-"} />
                    <InfoRow icon={Calendar} label="Documento" value={student.identityDocumentType && student.identityDocumentNumber ? `${student.identityDocumentType === "dni" ? "DNI" : "Pasaporte"}: ${student.identityDocumentNumber}` : "-"} />
              <InfoRow icon={Calendar} label="Nacimiento" value={student.birthdate ? `${format(new Date(student.birthdate), "d MMM yyyy", { locale: es })} (${age} años)` : "N/A"} />
              <InfoRow icon={Calendar} label="Inscripción" value={student.joinDate ? format(new Date(student.joinDate), "d MMM yyyy", { locale: es }) : "N/A"} />
              <InfoRow icon={DollarSign} label="Tipo de pago" value={PAYMENT_LABELS[student.paymentType]} />
              {visibleCustomFields.map((field) => (
                <InfoRow
                  key={field.id}
                  icon={User}
                  label={field.label}
                  value={formatCustomFieldValue(student.extraData?.[field.key])}
                />
              ))}
            </div>
          </section>

          <Separator />

          {student.guardian && (
            <>
              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> Tutor / Responsable
                </h4>
                <div className="space-y-2.5">
                  <InfoRow icon={User} label="Nombre" value={student.guardian.name} />
                  <InfoRow icon={Phone} label="Teléfono" value={student.guardian.phone} />
                  <InfoRow icon={Mail} label="Email" value={student.guardian.email} />
                </div>
              </section>
              <Separator />
            </>
          )}

          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3" /> Clases Inscriptas ({student.enrolledClasses.length})
            </h4>
            {student.enrolledClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin clases inscriptas actualmente.</p>
            ) : (
              <div className="space-y-2">
                {student.enrolledClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">{cls.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{cls.day} · {cls.time}</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground">€{cls.monthlyPrice}</span>
                  </div>
                ))}
                {monthlyTotal !== null && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Total mensual</span>
                    <span className="text-base font-bold text-primary">€{monthlyTotal}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {student.notes && (
            <>
              <Separator />
              <section className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" /> Notas
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-md p-3 border border-border">
                  {student.notes}
                </p>
              </section>
            </>
          )}

          <Separator />

          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3" /> Certificaciones
            </h4>
            <p className="text-sm text-muted-foreground">
              Las certificaciones de exámenes aprobados aparecerán aquí.
            </p>
          </section>
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
