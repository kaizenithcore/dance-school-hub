import { TeacherRecord } from "@/lib/data/mockTeachers";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Mail, Phone, BookOpen } from "lucide-react";

interface TeacherProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: TeacherRecord | null;
}

export function TeacherProfileDrawer({ open, onOpenChange, teacher }: TeacherProfileDrawerProps) {
  if (!teacher) return null;

  const hireYear = new Date(teacher.hireDate).getFullYear();
  const yearsOfExperience = new Date().getFullYear() - hireYear;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <SheetHeader>
          <SheetTitle>{teacher.name}</SheetTitle>
          <SheetDescription>Perfil del profesor</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={teacher.status === "active" ? "bg-success/15 text-success border-success/20" : "bg-muted text-muted-foreground"}>
              {teacher.status === "active" ? "Activo" : "Inactivo"}
            </Badge>
            <span className="text-xs text-muted-foreground">{yearsOfExperience} años en escuela</span>
          </div>

          <Separator />

          {/* Bio */}
          {teacher.bio && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Acerca de</p>
              <p className="text-sm text-foreground leading-relaxed">{teacher.bio}</p>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Contacto</p>
            {teacher.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${teacher.email}`} className="text-primary hover:underline">
                  {teacher.email}
                </a>
              </div>
            )}
            {teacher.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{teacher.phone}</span>
              </div>
            )}
          </div>

          {/* Specialties */}
          {/* <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Especialidades</p>
            <div className="flex flex-wrap gap-2">
              {teacher.specialties.map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div> */}

          {/* Assigned Classes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Clases Asignadas
              </p>
            </div>
            {teacher.assignedClasses.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin clases asignadas</p>
            ) : (
              <div className="space-y-2">
                {teacher.assignedClasses.map((cls) => (
                  <div key={cls.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm font-medium text-foreground">{cls.name}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{cls.day} {cls.time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-muted-foreground">{cls.room}</span>
                      <span className="font-medium text-foreground">{cls.students} estudiantes</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Salary */}
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Salario Mensual</p>
            <p className="text-lg font-semibold text-foreground">${teacher.aulary}</p>
          </div>

          {/* Notes */}
          {teacher.notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Notas</p>
              <p className="text-sm text-muted-foreground italic">{teacher.notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
