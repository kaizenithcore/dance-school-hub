import { EnrollmentFormConfig } from "@/lib/types/formBuilder";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Asterisk, ArrowLeft, ArrowRight, Send, Users, Plus, Trash2, CalendarDays } from "lucide-react";
import { WeeklySchedule } from "@/components/schedule/WeeklySchedule";
import { MOCK_CLASSES } from "@/lib/data/mockClasses";
import { ClassCardData } from "@/components/cards/ClassCard";

interface FormPreviewProps {
  config: EnrollmentFormConfig;
}

interface StudentEnrollment {
  id: string;
  label: string;
  values: Record<string, any>;
  selectedClassIds: string[];
}

export function FormPreview({ config }: FormPreviewProps) {
  const [students, setStudents] = useState<StudentEnrollment[]>([
    { id: "s1", label: "Alumno 1", values: {}, selectedClassIds: [] },
  ]);
  const [activeStudentIndex, setActiveStudentIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const activeStudent = students[activeStudentIndex];

  // Steps: sections + optional schedule
  const visibleSections = config.sections.filter((section) => {
    if (!section.conditions?.length) return true;
    // Evaluate conditions (simplified: check current student values)
    return section.conditions.every((cond) => {
      const val = activeStudent.values[cond.sourceFieldId];
      if (cond.operator === "is_not_empty") return val !== undefined && val !== "";
      if (cond.operator === "is_empty") return val === undefined || val === "";
      if (cond.operator === "equals") return String(val) === cond.value;
      if (cond.operator === "not_equals") return String(val) !== cond.value;
      if (cond.operator === "less_than") {
        // Handle date fields (age calculation)
        if (cond.sourceFieldId.includes("birthdate") || cond.sourceFieldId.includes("date")) {
          const birthDate = new Date(val);
          if (isNaN(birthDate.getTime())) return false;
          const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          return age < parseFloat(cond.value);
        }
        return parseFloat(val) < parseFloat(cond.value);
      }
      if (cond.operator === "greater_than") return parseFloat(val) > parseFloat(cond.value);
      if (cond.operator === "contains") return String(val).includes(cond.value);
      return true;
    });
  });

  const allSteps = [
    ...visibleSections.map((s) => ({ id: s.id, title: s.title, type: "form" as const })),
    ...(config.includeSchedule ? [{ id: "_schedule", title: "Selección de Clases", type: "schedule" as const }] : []),
  ];

  const currentStep = allSteps[step];
  const isLastStep = step === allSteps.length - 1;

  const setValue = (fieldId: string, value: any) => {
    setStudents((prev) =>
      prev.map((s, i) =>
        i === activeStudentIndex ? { ...s, values: { ...s.values, [fieldId]: value } } : s
      )
    );
  };

  const toggleClass = (classId: string) => {
    setStudents((prev) =>
      prev.map((s, i) =>
        i === activeStudentIndex
          ? {
              ...s,
              selectedClassIds: s.selectedClassIds.includes(classId)
                ? s.selectedClassIds.filter((id) => id !== classId)
                : [...s.selectedClassIds, classId],
            }
          : s
      )
    );
  };

  const addStudent = () => {
    if (!config.jointEnrollment.enabled) return;
    if (students.length >= config.jointEnrollment.maxStudents) return;
    const idx = students.length + 1;
    setStudents((prev) => [...prev, { id: `s${idx}`, label: `Alumno ${idx}`, values: {}, selectedClassIds: [] }]);
    setActiveStudentIndex(students.length);
    setStep(0);
  };

  const removeStudent = (index: number) => {
    if (students.length <= 1) return;
    setStudents((prev) => prev.filter((_, i) => i !== index));
    setActiveStudentIndex((prev) => Math.min(prev, students.length - 2));
  };

  const selectedClassesForStudent = (student: StudentEnrollment): ClassCardData[] =>
    MOCK_CLASSES.filter((c) => student.selectedClassIds.includes(c.id));

  const totalPrice = students.reduce(
    (sum, s) => sum + selectedClassesForStudent(s).reduce((cs, c) => cs + c.price, 0),
    0
  );

  if (showSummary) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h3 className="text-base font-semibold text-foreground">Resumen de Matrícula</h3>
        {students.map((student, si) => {
          const classes = selectedClassesForStudent(student);
          const subtotal = classes.reduce((s, c) => s + c.price, 0);
          return (
            <div key={student.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {si + 1}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {student.values.student_name || student.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">{classes.length} clases · ${subtotal}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground truncate">{cls.name}</span>
                    <span className="text-muted-foreground ml-auto whitespace-nowrap">{cls.day} · {cls.time}</span>
                    <span className="font-medium text-foreground">€{cls.price}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="flex justify-between items-center rounded-lg border border-border bg-accent/50 p-4">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-lg font-bold text-foreground">€{totalPrice}</span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowSummary(false)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <Button className="flex-1">
            <Send className="h-4 w-4 mr-1" /> Confirmar Matrícula
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Student tabs for joint enrollment */}
      {config.jointEnrollment.enabled && (
        <div className="flex items-center gap-2 flex-wrap">
          {students.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setActiveStudentIndex(i); setStep(0); }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                i === activeStudentIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {s.values.student_name || s.label}
              {students.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeStudent(i); }}
                  className="ml-1 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </button>
          ))}
          {students.length < config.jointEnrollment.maxStudents && (
            <button
              onClick={addStudent}
              className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" /> Añadir alumno
            </button>
          )}
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {allSteps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => i < step && setStep(i)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-accent text-accent-foreground cursor-pointer" : "bg-muted text-muted-foreground"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px] font-bold">{i + 1}</span>
            <span className="hidden sm:inline">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="animate-fade-in" key={`${activeStudent.id}-${currentStep?.id}`}>
        {currentStep?.type === "schedule" ? (
          <WeeklySchedule
            classes={MOCK_CLASSES}
            selectedClassIds={activeStudent.selectedClassIds}
            onToggleClass={toggleClass}
          />
        ) : currentStep ? (
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{currentStep.title}</h3>
              {visibleSections.find((s) => s.id === currentStep.id)?.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {visibleSections.find((s) => s.id === currentStep.id)?.description}
                </p>
              )}
            </div>
            <div className="space-y-4">
              {visibleSections
                .find((s) => s.id === currentStep.id)
                ?.fields.filter((field) => {
                  if (!field.conditions?.length) return true;
                  return field.conditions.every((cond) => {
                    const val = activeStudent.values[cond.sourceFieldId];
                    if (cond.operator === "equals") return String(val) === cond.value;
                    if (cond.operator === "not_equals") return String(val) !== cond.value;
                    if (cond.operator === "is_not_empty") return val !== undefined && val !== "";
                    if (cond.operator === "is_empty") return !val;
                    if (cond.operator === "less_than") {
                      if (cond.sourceFieldId.includes("birthdate")) {
                        const bd = new Date(val);
                        if (isNaN(bd.getTime())) return false;
                        return Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) < parseFloat(cond.value);
                      }
                      return parseFloat(val) < parseFloat(cond.value);
                    }
                    if (cond.operator === "greater_than") return parseFloat(val) > parseFloat(cond.value);
                    if (cond.operator === "contains") return String(val).includes(cond.value);
                    return true;
                  });
                })
                .map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">
                      {field.label}
                      {field.required && <Asterisk className="inline h-2.5 w-2.5 text-destructive ml-0.5" />}
                    </Label>
                    {field.type === "checkbox" ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={!!activeStudent.values[field.id]}
                          onCheckedChange={(v) => setValue(field.id, v)}
                        />
                        <span className="text-xs text-muted-foreground">{field.label}</span>
                      </div>
                    ) : field.type === "textarea" ? (
                      <Textarea
                        value={activeStudent.values[field.id] || ""}
                        onChange={(e) => setValue(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="text-xs resize-none"
                        rows={3}
                      />
                    ) : field.type === "select" ? (
                      <Select value={activeStudent.values[field.id] || ""} onValueChange={(v) => setValue(field.id, v)}>
                        <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {field.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === "file" ? (
                      <div className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                        Arrastra o haz clic para subir ({field.accept})
                      </div>
                    ) : (
                      <Input
                        type={field.type}
                        value={activeStudent.values[field.id] || ""}
                        onChange={(e) => setValue(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="text-xs h-9"
                      />
                    )}
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0} className={cn(step === 0 && "invisible")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        {isLastStep ? (
          <Button onClick={() => setShowSummary(true)}>
            Ver Resumen <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => Math.min(s + 1, allSteps.length - 1))}>
            Siguiente <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
