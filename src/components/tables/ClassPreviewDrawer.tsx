import { ClassRecord } from "@/lib/data/mockClassRecords";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Euro, GraduationCap, MapPin, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData: ClassRecord | null;
}

const STATUS_MAP: Record<ClassRecord["status"], { label: string; className: string }> = {
  active: { label: "Activa", className: "bg-success/15 text-success border-success/20" },
  inactive: { label: "Inactiva", className: "bg-muted text-muted-foreground border-border" },
  draft: { label: "Borrador", className: "bg-warning/15 text-warning border-warning/20" },
};

export function ClassPreviewDrawer({ open, onOpenChange, classData }: ClassPreviewDrawerProps) {
  if (!classData) return null;

  const status = STATUS_MAP[classData.status];
  const occupancy = classData.capacity > 0 ? Math.round((classData.enrolled / classData.capacity) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{classData.name}</SheetTitle>
          <SheetDescription>Vista previa de la clase</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px]", status.className)}>{status.label}</Badge>
            <span className="text-xs text-muted-foreground">{classData.discipline} · {classData.category}</span>
          </div>

          <Separator />

          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos principales</h4>
            <InfoRow icon={BookOpen} label="Disciplina" value={classData.discipline} />
            <InfoRow icon={User} label="Profesor" value={classData.teacher} />
            <InfoRow icon={MapPin} label="Aula" value={classData.room} />
            <InfoRow icon={Euro} label="Precio" value={`€${classData.price}`} />
          </section>

          <Separator />

          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3" /> Ocupación
            </h4>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">{classData.enrolled}/{classData.capacity} plazas</span>
                <span className="text-sm font-semibold text-foreground">{occupancy}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    occupancy >= 90 ? "bg-destructive" : occupancy >= 70 ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(occupancy, 100)}%` }}
                />
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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
