import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ClassCardData } from "@/components/cards/ClassCard";
import { DAYS_ES, TIME_SLOTS } from "@/lib/data/mockClasses";
import { CalendarDays, List, Repeat, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { JointStudentFormData } from "@/components/forms/JointEnrollmentForm";

interface JointEnrollmentScheduleSelectorProps {
  classes: ClassCardData[];
  students: JointStudentFormData[];
  onStudentsChange: (students: JointStudentFormData[]) => void;
  scheduleConfig?: {
    preferredView: "calendar" | "list";
    recurringSelectionMode: "linked" | "single_day";
    recurringClassOverrides: string[];
    calendarFields: {
      showDiscipline: boolean;
      showCategory: boolean;
      showRoom: boolean;
      showCapacity: boolean;
      showPrice: boolean;
      showSelectedStudents: boolean;
    };
  };
}

type ViewMode = "calendar" | "list";
type FilterMode = "all" | "weekly" | "once";

function parseStartHour(time: string): number {
  const match = time.match(/^(\d{2}):(\d{2})/);
  return match ? parseInt(match[1]) : 0;
}

function getSourceClassId(entry: ClassCardData): string {
  return entry.sourceClassId || entry.id.split("::")[0] || entry.id;
}

export function JointEnrollmentScheduleSelector({
  classes,
  students,
  onStudentsChange,
  scheduleConfig,
}: JointEnrollmentScheduleSelectorProps) {
  const effectiveConfig = scheduleConfig ?? {
    preferredView: "calendar" as const,
    recurringSelectionMode: "linked" as const,
    recurringClassOverrides: [] as string[],
    calendarFields: {
      showDiscipline: true,
      showCategory: false,
      showRoom: true,
      showCapacity: true,
      showPrice: true,
      showSelectedStudents: true,
    },
  };

  const [view, setView] = useState<ViewMode>(effectiveConfig.preferredView);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedClass, setSelectedClass] = useState<ClassCardData | null>(null);
  const [selectedClassSelectionIds, setSelectedClassSelectionIds] = useState<string[]>([]);
  const [studentSelections, setStudentSelections] = useState<Record<string, boolean>>({});

  const recurringOverrides = useMemo(
    () => new Set(effectiveConfig.recurringClassOverrides || []),
    [effectiveConfig.recurringClassOverrides]
  );

  const scheduleCountByClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const cls of classes) {
      const sourceClassId = getSourceClassId(cls);
      map.set(sourceClassId, (map.get(sourceClassId) || 0) + 1);
    }
    return map;
  }, [classes]);

  const allowSingleDayForClass = (sourceClassId: string) => {
    if (effectiveConfig.recurringSelectionMode === "single_day") {
      return !recurringOverrides.has(sourceClassId);
    }
    return recurringOverrides.has(sourceClassId);
  };

  const getSelectionIdsForClass = (classData: ClassCardData): string[] => {
    const sourceClassId = getSourceClassId(classData);
    const scheduleCount = scheduleCountByClass.get(sourceClassId) || 1;
    const linkedSelection = scheduleCount > 1 && !allowSingleDayForClass(sourceClassId);

    if (!linkedSelection) {
      return [classData.id];
    }

    return classes
      .filter((entry) => getSourceClassId(entry) === sourceClassId)
      .map((entry) => entry.id);
  };

  const hasSelectionForClass = (student: JointStudentFormData, classData: ClassCardData) => {
    const selectionIds = getSelectionIdsForClass(classData);
    return selectionIds.some((selectionId) => student.selectedClassIds.includes(selectionId));
  };

  const filteredClasses = classes.filter((c) => {
    if (filter === "weekly") return c.recurrence === "weekly";
    if (filter === "once") return c.recurrence === "once";
    return true;
  });

  const handleClassClick = (classData: ClassCardData) => {
    const isFull = classData.spotsLeft === 0;
    if (isFull) return;

    const selectionIds = getSelectionIdsForClass(classData);

    setSelectedClass(classData);
    setSelectedClassSelectionIds(selectionIds);
    // Initialize selections with current state
    const currentSelections: Record<string, boolean> = {};
    students.forEach((student) => {
      currentSelections[student.id] = selectionIds.some((selectionId) => student.selectedClassIds.includes(selectionId));
    });
    setStudentSelections(currentSelections);
  };

  const handleStudentToggle = (studentId: string, selected: boolean) => {
    setStudentSelections((prev) => ({
      ...prev,
      [studentId]: selected,
    }));
  };

  const handleConfirmSelection = () => {
    if (!selectedClass || selectedClassSelectionIds.length === 0) return;

    onStudentsChange(
      students.map((student) => {
        const shouldInclude = studentSelections[student.id];
        const hasAnySelection = selectedClassSelectionIds.some((selectionId) => student.selectedClassIds.includes(selectionId));

        if (shouldInclude && !hasAnySelection) {
          return {
            ...student,
            selectedClassIds: [...student.selectedClassIds, ...selectedClassSelectionIds],
          };
        } else if (!shouldInclude && hasAnySelection) {
          return {
            ...student,
            selectedClassIds: student.selectedClassIds.filter((id) => !selectedClassSelectionIds.includes(id)),
          };
        }

        return student;
      })
    );

    setSelectedClass(null);
    setSelectedClassSelectionIds([]);
    setStudentSelections({});
  };

  const getSelectedStudentCount = (classData: ClassCardData) => {
    return students.filter((student) => hasSelectionForClass(student, classData)).length;
  };

  const classCardWithSelection = (cls: ClassCardData) => {
    const selectedCount = getSelectedStudentCount(cls);
    const isFull = cls.spotsLeft === 0;

    return (
      <button
        type="button"
        key={cls.id}
        onClick={() => handleClassClick(cls)}
        disabled={isFull}
        title="Haz clic para asignar alumnos a esta clase"
        className={cn(
          "w-full text-left rounded-lg border p-4 transition-all duration-200 relative",
          "hover:shadow-medium hover:border-primary/30",
          selectedCount > 0
            ? "border-primary bg-accent shadow-medium ring-1 ring-primary/20"
            : "border-border bg-card shadow-soft",
          isFull && "opacity-50 cursor-not-allowed hover:shadow-soft hover:border-border"
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-foreground text-sm">{cls.name}</h4>
          <div className="flex flex-col items-end gap-1">
            <span className="font-semibold text-primary text-sm">€{cls.price}</span>
            {selectedCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {selectedCount}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          {effectiveConfig.calendarFields.showDiscipline && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="font-medium">Disciplina:</span> {cls.teacher}
            </p>
          )}
          {effectiveConfig.calendarFields.showCategory && cls.category && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="font-medium">Categoría:</span> {cls.category}
            </p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="font-medium">Horario:</span> {cls.time}
          </p>
          {effectiveConfig.calendarFields.showRoom && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="font-medium">Sala:</span> {cls.room}
            </p>
          )}
        </div>

        {(effectiveConfig.calendarFields.showCapacity || effectiveConfig.calendarFields.showPrice) && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            {effectiveConfig.calendarFields.showCapacity ? (
              <span>Capacidad: {cls.spotsLeft}/{cls.totalSpots}</span>
            ) : (
              <span />
            )}
            {effectiveConfig.calendarFields.showPrice && (
              <span className="font-medium text-primary">€{cls.price}</span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-muted/30 rounded-lg p-3 mb-4">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
          Haz clic en una clase para añadirla a uno o varios alumnos. La misma clase puede ser seleccionada por múltiples alumnos.
        </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setView("calendar")}
            title="Ver clases en formato de calendario semanal"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "calendar" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendario
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            title="Ver clases en formato de lista con detalles completos"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
        </div>

        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          {(["all", "weekly", "once"] as FilterMode[]).map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" && "Todas"}
              {f === "weekly" && (
                <>
                  <Repeat className="h-3 w-3" /> Semanales
                </>
              )}
              {f === "once" && (
                <>
                  <CalendarDays className="h-3 w-3" /> Puntuales
                </>
              )}
            </button>
          ))}
        </div>
      </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" ? (
        <div className="rounded-lg border border-border bg-card shadow-soft overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border">
              <div className="p-2" />
              {DAYS_ES.map((day) => (
                <div key={day} className="p-3 text-center text-xs font-semibold text-foreground border-l border-border">
                  {day}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative">
              {TIME_SLOTS.map((slot) => (
                <div key={slot} className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border last:border-0">
                  <div className="p-2 text-right pr-3">
                    <span className="text-[10px] text-muted-foreground">{slot}</span>
                  </div>
                  {DAYS_ES.map((day) => {
                    const classesInSlot = filteredClasses.filter(
                      (c) => c.day === day && parseStartHour(c.time) === parseInt(slot)
                    );
                    return (
                      <div key={`${day}-${slot}`} className="border-l border-border min-h-[88px] p-1 relative">
                        {classesInSlot.map((cls) => (
                          <button
                            type="button"
                            key={cls.id}
                            onClick={() => handleClassClick(cls)}
                            disabled={cls.spotsLeft === 0}
                            title="Haz clic para asignar alumnos a esta clase"
                            className={cn(
                              "w-full h-full text-left rounded-lg border p-2 transition-all duration-200 text-xs group",
                              "hover:shadow-lg hover:border-primary/50 hover:scale-[1.02]",
                              getSelectedStudentCount(cls) > 0
                                ? "border-primary bg-accent shadow-medium ring-2 ring-primary/30"
                                : "border-border bg-card shadow-soft",
                              cls.spotsLeft === 0 && "opacity-50 cursor-not-allowed hover:shadow-soft hover:border-border hover:scale-100"
                            )}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <p className="font-semibold text-[11px] leading-tight flex-1">{cls.name}</p>
                              {effectiveConfig.calendarFields.showSelectedStudents && getSelectedStudentCount(cls) > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                                  {getSelectedStudentCount(cls)}
                                </span>
                              )}
                            </div>
                            {effectiveConfig.calendarFields.showDiscipline && (
                              <p className="text-[10px] text-muted-foreground leading-tight">{cls.teacher}</p>
                            )}
                            {effectiveConfig.calendarFields.showCategory && cls.category && (
                              <p className="text-[10px] text-muted-foreground leading-tight">{cls.category}</p>
                            )}
                            {effectiveConfig.calendarFields.showRoom && (
                              <p className="text-[10px] text-muted-foreground leading-tight">{cls.room}</p>
                            )}
                            {(effectiveConfig.calendarFields.showPrice || effectiveConfig.calendarFields.showCapacity) && (
                              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/50">
                                {effectiveConfig.calendarFields.showPrice ? (
                                  <p className="text-[10px] font-semibold text-primary">€{cls.price}</p>
                                ) : (
                                  <span />
                                )}
                                {effectiveConfig.calendarFields.showCapacity && (
                                  <p className="text-[10px] text-muted-foreground">{cls.spotsLeft}/{cls.totalSpots}</p>
                                )}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {DAYS_ES.map((day) => {
            const dayClasses = filteredClasses
              .filter((c) => c.day === day)
              .sort((a, b) => parseStartHour(a.time) - parseStartHour(b.time));

            if (dayClasses.length === 0) return null;

            return (
              <div key={day}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{day}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dayClasses.map((cls) => classCardWithSelection(cls))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student Selection Dialog */}
      <Dialog
        open={!!selectedClass}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedClass(null);
            setSelectedClassSelectionIds([]);
            setStudentSelections({});
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar alumnos para {selectedClass?.name}</DialogTitle>
            <DialogDescription>
              Selecciona los alumnos que deseas inscribir en esta clase. {selectedClass && getSelectionIdsForClass(selectedClass).length > 1
                ? "Esta clase aplica selección enlazada entre varios días según la configuración del formulario."
                : "La misma clase puede ser seleccionada por varios alumnos."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-auto">
            {students.map((student) => (
              <div key={student.id} className="flex items-center space-x-3 rounded-lg border border-border p-3">
                <Checkbox
                  id={`student-${student.id}`}
                  checked={studentSelections[student.id] || false}
                  onCheckedChange={(checked) => handleStudentToggle(student.id, checked === true)}
                />
                <Label
                  htmlFor={`student-${student.id}`}
                  className="flex-1 cursor-pointer text-sm font-medium"
                >
                  {String(student.values.first_name || student.values.name || `Alumno ${students.indexOf(student) + 1}`)}
                </Label>
                {(studentSelections[student.id] || false) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedClass(null);
                setSelectedClassSelectionIds([]);
                setStudentSelections({});
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmSelection} className="flex-1">
              Confirmar Selección
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
