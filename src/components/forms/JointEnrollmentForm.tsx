import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X, Plus, Trash2 } from "lucide-react";
import type { FormSection, FormField, FieldCondition, EnrollmentFormConfig, ScheduleDisplaySettings } from "@/lib/api/publicEnrollment";
import type { PublicClass } from "@/lib/api/publicEnrollment";
import { JointEnrollmentScheduleSelector } from "@/components/schedule/JointEnrollmentScheduleSelector";
import type { ClassCardData } from "@/components/cards/ClassCard";

export interface JointStudentFormData {
  id: string;
  values: Record<string, unknown>;
  selectedClassIds: string[];
  errors: Record<string, string>;
}

interface JointEnrollmentFormProps {
  sections: FormSection[];
  availableClasses: PublicClass[];
  payerValues: Record<string, unknown>;
  payerErrors: Record<string, string>;
  students: JointStudentFormData[];
  onStudentsChange: (students: JointStudentFormData[]) => void;
  onPayerChange: (values: Record<string, unknown>) => void;
  onPayerErrorChange: (errors: Record<string, string>) => void;
  renderField: (
    field: FormField,
    values: Record<string, unknown>,
    setValues: Dispatch<SetStateAction<Record<string, unknown>>>,
    errors: Record<string, string>,
    setErrors: Dispatch<SetStateAction<Record<string, string>>>,
    idPrefix?: string
  ) => React.ReactNode;
  isVisible: (conditions: FieldCondition[] | undefined, values: Record<string, unknown>) => boolean;
  jointConfig?: EnrollmentFormConfig["jointEnrollment"];
  scheduleSettings?: ScheduleDisplaySettings;
  maxStudents?: number;
}

export function JointEnrollmentForm({
  sections,
  availableClasses,
  payerValues,
  payerErrors,
  students,
  onStudentsChange,
  onPayerChange,
  onPayerErrorChange,
  renderField,
  isVisible,
  jointConfig,
  scheduleSettings,
  maxStudents = 10,
}: JointEnrollmentFormProps) {
  const scheduleConfig: ScheduleDisplaySettings = scheduleSettings ?? jointConfig?.schedule ?? {
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

  const recurringOverrides = new Set(scheduleConfig.recurringClassOverrides || []);
  const allowSingleDayForClass = (classId: string) => {
    if (scheduleConfig.recurringSelectionMode === "single_day") {
      return !recurringOverrides.has(classId);
    }
    return recurringOverrides.has(classId);
  };

  // Convert PublicClass to ClassCardData for the schedule selector
  // Each class schedule becomes a separate card entry for easier selection
  const classCardDataList: ClassCardData[] = availableClasses.flatMap((cls) => {
    if (!cls.schedules || cls.schedules.length === 0) {
      // Fallback if no schedules (shouldn't happen, but just in case)
      return {
        id: `${cls.id}::default`,
        sourceClassId: cls.id,
        scheduleId: "default",
        name: cls.name,
        teacher: cls.discipline, // Use discipline as fallback
        category: cls.category,
        time: "00:00–01:00",
        room: "Sin asignar",
        price: Math.ceil(cls.price_cents / 100),
        spotsLeft: Math.max(0, cls.capacity - cls.enrolled_count),
        totalSpots: cls.capacity,
        day: "Lunes",
        recurrence: "weekly" as const,
      };
    }

    const isRecurringClass = cls.schedules.length > 1;
    const allowSingleDay = allowSingleDayForClass(cls.id);
    const linkedSelection = isRecurringClass && !allowSingleDay;

    return cls.schedules.map((schedule) => {
      const startHour = schedule.startHour;
      const endHour = startHour + schedule.duration;
      const startMin = String(startHour).padStart(2, "0");
      const endMin = String(Math.floor(endHour)).padStart(2, "0");
      const endSec = (endHour % 1) * 60;
      const endMinAdjusted = endSec > 0 ? String(Math.floor(endHour)).padStart(2, "0") : endMin;

      return {
        id: linkedSelection ? `${cls.id}::${schedule.id}` : `${cls.id}::${schedule.id}`,
        sourceClassId: cls.id,
        scheduleId: schedule.id,
        name: cls.name,
        teacher: cls.discipline, // Use discipline as teacher placeholder
        category: cls.category,
        time: `${startMin}:00–${endMinAdjusted}:${endSec > 0 ? "30" : "00"}`,
        room: schedule.room,
        price: Math.ceil(cls.price_cents / 100),
        spotsLeft: Math.max(0, cls.capacity - cls.enrolled_count),
        totalSpots: cls.capacity,
        day: schedule.day,
        recurrence: "weekly" as const,
      };
    });
  });
  const addStudent = () => {
    if (students.length >= maxStudents) return;
    onStudentsChange([...students, {
      id: `student-${Date.now()}`, 
      values: {}, 
      selectedClassIds: [], 
      errors: {} 
    }]);
  };

  const removeStudent = (id: string) => {
    if (students.length <= 1) return; // Keep at least one student
    onStudentsChange(students.filter((s) => s.id !== id));
  };

  const updateStudentValues = (id: string, nextValues: SetStateAction<Record<string, unknown>>) => {
    onStudentsChange(
      students.map((s) => {
        if (s.id !== id) return s;
        const values = typeof nextValues === "function" ? nextValues(s.values) : nextValues;
        return { ...s, values };
      })
    );
  };

  const updateStudentErrors = (id: string, nextErrors: SetStateAction<Record<string, string>>) => {
    onStudentsChange(
      students.map((s) => {
        if (s.id !== id) return s;
        const errors = typeof nextErrors === "function" ? nextErrors(s.errors) : nextErrors;
        return { ...s, errors };
      })
    );
  };

  // Find payer section (usually contains guardian/tutor info)
  const payerSection = sections.find(s => 
    s.title.toLowerCase().includes('tutor') || 
    s.title.toLowerCase().includes('responsable') ||
    s.title.toLowerCase().includes('pagador') ||
    s.id === 'payer_info'
  ) || sections[0]; // Fallback to first section

  // Student sections (excluding payer section)
  const studentSections = sections.filter(s => s.id !== payerSection?.id);

  return (
    <div className="space-y-6">
      {/* Payer Information */}
      {payerSection && (
        <Card>
          <CardHeader>
            <CardTitle>1. {payerSection.title || "Datos del responsable"}</CardTitle>
            {payerSection.description && <CardDescription>{payerSection.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {payerSection.fields
              .filter(field => isVisible(field.conditions, payerValues))
              .map(field => (
                <div key={field.id} className="space-y-2">
                  {field.type !== "checkbox" && field.type !== "info" ? (
                    <Label htmlFor={field.id}>{`${field.label}${field.required ? " *" : ""}`}</Label>
                  ) : field.type === "checkbox" && field.placeholder ? (
                    <Label htmlFor={field.id}>{`${field.label}${field.required ? " *" : ""}`}</Label>
                  ) : null}
                  {renderField(field, payerValues, onPayerChange, payerErrors, onPayerErrorChange)}
                  {payerErrors[field.id] && (
                    <p className="text-xs text-destructive">{payerErrors[field.id]}</p>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Students */}
      <div className="space-y-4">
        {students.map((student, index) => (
          <Card key={student.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle>{index + 2}. Alumno {index + 1}</CardTitle>
              {students.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                  onClick={() => removeStudent(student.id)}
                >
                  <X className="h-4 w-4 mr-1" /> Eliminar
                </Button>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Student fields */}
              {studentSections.map(section => (
                <div key={section.id} className="space-y-4">
                  {section.title && section.title !== payerSection?.title && (
                    <h4 className="font-medium text-sm text-muted-foreground">{section.title}</h4>
                  )}
                  {section.fields
                    .filter(field => isVisible(field.conditions, student.values))
                    .map(field => (
                      <div key={field.id} className="space-y-2">
                        {field.type !== "checkbox" && field.type !== "info" ? (
                          <Label htmlFor={`${student.id}::${field.id}`}>{`${field.label}${field.required ? " *" : ""}`}</Label>
                        ) : field.type === "checkbox" && field.placeholder ? (
                          <Label htmlFor={`${student.id}::${field.id}`}>{`${field.label}${field.required ? " *" : ""}`}</Label>
                        ) : null}
                        {renderField(
                          field,
                          student.values,
                          (values) => updateStudentValues(student.id, values),
                          student.errors,
                          (errors) => updateStudentErrors(student.id, errors),
                          `${student.id}::`
                        )}
                        {student.errors[field.id] && (
                          <p className="text-xs text-destructive">{student.errors[field.id]}</p>
                        )}
                      </div>
                    ))}
                </div>
              ))}

              {/* Summary of selected classes for this student */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label>Clases seleccionadas</Label>
                  {student.selectedClassIds.length > 0 && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      {student.selectedClassIds.length}
                    </span>
                  )}
                </div>
                {student.selectedClassIds.length > 0 ? (
                  <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                    {student.selectedClassIds.map((classId) => {
                      const classCard = classCardDataList.find((c) => c.id === classId) || classCardDataList.find((c) => c.sourceClassId === classId);
                      if (!classCard) return null;
                      return (
                        <div key={classId} className="flex items-center justify-between rounded-md bg-card p-2 border border-border/50">
                          <div>
                            <p className="text-sm font-medium">{classCard.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {classCard.time} - €{classCard.price}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onStudentsChange(
                                students.map((s) =>
                                  s.id === student.id
                                    ? { ...s, selectedClassIds: s.selectedClassIds.filter((id) => id !== classId) }
                                    : s
                                )
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Usa el selector de horario para añadir clases
                  </p>
                )}
                {student.errors.class_id && student.selectedClassIds.length === 0 && (
                  <p className="text-xs text-destructive">{student.errors.class_id}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Class Selection - Moved after students */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border-l-4 border-l-green-500">
          <h3 className="text-lg font-semibold text-green-900">📅 Selección de Clases</h3>
        </div>
        
        {/* Schedule-based class selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horario de clases disponibles</CardTitle>
            <CardDescription>
              Haz clic en una clase para añadirla a uno o varios alumnos. La misma clase puede ser seleccionada por múltiples alumnos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JointEnrollmentScheduleSelector
              classes={classCardDataList}
              students={students}
              onStudentsChange={onStudentsChange}
              scheduleConfig={scheduleConfig}
            />
          </CardContent>
        </Card>
      ))

      {/* Add student button below the list */}
      {students.length < maxStudents && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addStudent}
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir alumno
        </Button>
      )}
      </div>
    </div>
  );
}
