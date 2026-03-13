import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  getPublicFormData,
  submitPublicEnrollment,
  type EnrollmentFormConfig,
  type FieldCondition,
  type FormField,
  type PublicFormData,
} from "@/lib/api/publicEnrollment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PublicScheduleSelector } from "@/components/schedule/PublicScheduleSelector";
import { DynamicPricingSummary } from "@/components/pricing/DynamicPricingSummary";
import { JointEnrollmentForm, type JointStudentFormData } from "@/components/forms/JointEnrollmentForm";

function isBlank(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return value === false;
  return false;
}

function resolveDateReference(rawValue: string) {
  if (rawValue === "today") {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  const minusYearsMatch = rawValue.match(/^today_minus_(\d+)y$/);
  if (minusYearsMatch) {
    const years = Number(minusYearsMatch[1]);
    if (Number.isFinite(years)) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      now.setFullYear(now.getFullYear() - years);
      return now;
    }
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function evaluateCondition(values: Record<string, unknown>, condition: FieldCondition): boolean {
  const raw = values[condition.sourceFieldId];
  const value = raw == null ? "" : String(raw);

  if (condition.operator === "is_not_empty") return value.trim().length > 0;
  if (condition.operator === "is_empty") return value.trim().length === 0;
  if (condition.operator === "equals") return value === condition.value;
  if (condition.operator === "not_equals") return value !== condition.value;
  if (condition.operator === "contains") return value.includes(condition.value);

  if (condition.operator === "date_before" || condition.operator === "date_after") {
    const sourceDate = resolveDateReference(value);
    const targetDate = resolveDateReference(condition.value);
    if (!sourceDate || !targetDate) return false;
    return condition.operator === "date_before"
      ? sourceDate.getTime() < targetDate.getTime()
      : sourceDate.getTime() > targetDate.getTime();
  }

  if (condition.operator === "less_than" || condition.operator === "greater_than") {
    const fieldKey = condition.sourceFieldId.toLowerCase();
    const maybeDate = fieldKey.includes("birthdate") || fieldKey.includes("date") || fieldKey.includes("nacimiento");

    if (maybeDate) {
      const birthDate = new Date(value);
      if (Number.isNaN(birthDate.getTime())) return false;
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const target = Number(condition.value);
      if (Number.isNaN(target)) return false;
      return condition.operator === "less_than" ? age < target : age > target;
    }

    const numericValue = Number(value);
    const target = Number(condition.value);
    if (Number.isNaN(numericValue) || Number.isNaN(target)) return false;
    return condition.operator === "less_than" ? numericValue < target : numericValue > target;
  }

  return true;
}

function isVisible(conditions: FieldCondition[] | undefined, values: Record<string, unknown>) {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((condition) => evaluateCondition(values, condition));
}

function isValidEmail(value: unknown) {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function findValueByKey(values: Record<string, unknown>, includes: string[]) {
  const match = Object.entries(values).find(([key, value]) =>
    includes.some((token) => key.toLowerCase().includes(token)) && typeof value === "string" && value.trim().length > 0
  );
  return typeof match?.[1] === "string" ? match[1].trim() : "";
}

function extractPayerInfo(values: Record<string, unknown>) {
  return {
    name: findValueByKey(values, ["payer_name", "guardian_name", "tutor_name", "responsable", "name"]),
    email: findValueByKey(values, ["payer_email", "guardian_email", "tutor_email", "email"]),
    phone: findValueByKey(values, ["payer_phone", "guardian_phone", "tutor_phone", "phone", "telefono"]),
  };
}

function extractStudentInfo(values: Record<string, unknown>) {
  return {
    name: findValueByKey(values, ["student_name", "first_name", "name", "nombre"]),
    email: findValueByKey(values, ["student_email", "email", "correo"]),
    phone: findValueByKey(values, ["student_phone", "phone", "telefono"]),
    guardianName: findValueByKey(values, ["guardian_name", "tutor_name", "responsable"]),
    guardianEmail: findValueByKey(values, ["guardian_email", "tutor_email"]),
    guardianPhone: findValueByKey(values, ["guardian_phone", "tutor_phone", "responsable_phone"]),
  };
}

function selectionIdToClassId(selectionId: string) {
  return selectionId.split("::")[0] || selectionId;
}

function selectionIdToScheduleId(selectionId: string) {
  const [, scheduleId] = selectionId.split("::");
  return scheduleId;
}

function normalizeRecurringMode(value: unknown): "linked" | "single_day" | undefined {
  return value === "single_day" || value === "linked" ? value : undefined;
}

function renderField(
  field: FormField,
  values: Record<string, unknown>,
  setValues: Dispatch<SetStateAction<Record<string, unknown>>>,
  errors: Record<string, string>,
  setErrors: Dispatch<SetStateAction<Record<string, string>>>
) {
  const clearError = () => {
    if (!errors[field.id]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field.id];
      return next;
    });
  };

  const onStringChange = (newValue: string) => {
    setValues((prev) => ({ ...prev, [field.id]: newValue }));
    clearError();
  };

  if (field.type === "textarea") {
    return (
      <Textarea
        value={(values[field.id] as string) || ""}
        onChange={(event) => onStringChange(event.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className={errors[field.id] ? "border-destructive" : ""}
      />
    );
  }

  if (field.type === "select") {
    return (
      <Select
        value={(values[field.id] as string) || ""}
        onValueChange={(selected) => onStringChange(selected)}
      >
        <SelectTrigger className={errors[field.id] ? "border-destructive" : ""}>
          <SelectValue placeholder="Seleccionar..." />
        </SelectTrigger>
        <SelectContent>
          {(field.options || []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={Boolean(values[field.id])}
          onCheckedChange={(checked) => {
            setValues((prev) => ({ ...prev, [field.id]: Boolean(checked) }));
            clearError();
          }}
        />
        <span className="text-sm text-muted-foreground">{field.placeholder || field.label}</span>
      </div>
    );
  }

  if (field.type === "info") {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        {field.placeholder || field.label}
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <Input
        type="file"
        accept={field.accept}
        onChange={(event) => {
          const fileName = event.target.files?.[0]?.name ?? "";
          onStringChange(fileName);
        }}
        className={errors[field.id] ? "border-destructive" : ""}
      />
    );
  }

  const inputType = field.type === "email" || field.type === "date" || field.type === "number" || field.type === "tel" ? field.type : "text";

  return (
    <Input
      type={inputType}
      value={(values[field.id] as string) || ""}
      onChange={(event) => onStringChange(event.target.value)}
      placeholder={field.placeholder}
      maxLength={field.maxLength}
      className={errors[field.id] ? "border-destructive" : ""}
    />
  );
}

export default function EnrollPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [searchParams] = useSearchParams();
  const tenantSlug = schoolSlug;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formConfig, setFormConfig] = useState<PublicFormData | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payerValues, setPayerValues] = useState<Record<string, unknown>>({});
  const [payerErrors, setPayerErrors] = useState<Record<string, string>>({});
  const [jointStudents, setJointStudents] = useState<JointStudentFormData[]>([
    { id: "student-1", values: {}, selectedClassIds: [], errors: {} },
  ]);
  const [smartDefaultsApplied, setSmartDefaultsApplied] = useState(false);

  const isJointEnrollmentEnabled = Boolean(formConfig?.formConfig?.jointEnrollment?.enabled);

  const payerSection = useMemo(() => {
    const sections = formConfig?.formConfig?.sections || [];
    if (sections.length === 0) return null;
    return (
      sections.find(
        (section) =>
          section.title.toLowerCase().includes("tutor") ||
          section.title.toLowerCase().includes("responsable") ||
          section.title.toLowerCase().includes("pagador") ||
          section.id === "payer_info"
      ) || sections[0]
    );
  }, [formConfig]);

  const studentSections = useMemo(() => {
    const sections = formConfig?.formConfig?.sections || [];
    if (!payerSection) return sections;
    return sections.filter((section) => section.id !== payerSection.id);
  }, [formConfig, payerSection]);

  useEffect(() => {
    const loadFormData = async () => {
      if (!tenantSlug) return;

      setLoading(true);
      try {
        const data = await getPublicFormData(tenantSlug);
        if (!data) {
          toast.error("No se encontro la escuela o esta inactiva");
          setLoading(false);
          return;
        }

        setFormConfig(data);
      } catch {
        toast.error("Error al cargar el formulario");
      } finally {
        setLoading(false);
      }
    };

    void loadFormData();
  }, [tenantSlug]);

  useEffect(() => {
    if (!formConfig) return;
    setValues({});
    setErrors({});
    setSelectedClassIds([]);
    setPayerValues({});
    setPayerErrors({});
    setJointStudents([{ id: "student-1", values: {}, selectedClassIds: [], errors: {} }]);
    setSmartDefaultsApplied(false);
  }, [formConfig?.tenantId]);

  useEffect(() => {
    if (!formConfig || smartDefaultsApplied) {
      return;
    }

    const classIdFromQuery = searchParams.get("classId") || searchParams.get("class_id");
    const classIdsFromQuery = (searchParams.get("classIds") || searchParams.get("class_ids") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const disciplineFromQuery = (searchParams.get("discipline") || "").trim().toLowerCase();

    const selectedFromQuery = new Set<string>();
    if (classIdFromQuery) selectedFromQuery.add(classIdFromQuery);
    classIdsFromQuery.forEach((id) => selectedFromQuery.add(id));

    if (disciplineFromQuery) {
      formConfig.availableClasses
        .filter((item) => item.discipline.trim().toLowerCase() === disciplineFromQuery)
        .forEach((item) => selectedFromQuery.add(item.id));
    }

    const validSelection = Array.from(selectedFromQuery).filter((id) => formConfig.availableClasses.some((item) => item.id === id));
    if (validSelection.length > 0) {
      if (isJointEnrollmentEnabled) {
        const mappedJointSelection = validSelection.map((classId) => {
          const classInfo = formConfig.availableClasses.find((item) => item.id === classId);
          const firstScheduleId = classInfo?.schedules?.[0]?.id;
          return firstScheduleId ? `${classId}::${firstScheduleId}` : classId;
        });

        setJointStudents((prev) => {
          if (prev.length === 0) {
            return [{ id: "student-1", values: {}, selectedClassIds: mappedJointSelection, errors: {} }];
          }

          const [first, ...rest] = prev;
          return [{ ...first, selectedClassIds: mappedJointSelection }, ...rest];
        });
      } else {
        const baseScheduleConfig = formConfig.formConfig.scheduleSettings ?? formConfig.formConfig.jointEnrollment?.schedule;
        const recurringMode = normalizeRecurringMode(formConfig.scheduleConfig?.recurringSelectionMode) ?? baseScheduleConfig?.recurringSelectionMode;

        const mappedSelection = validSelection.flatMap((classId) => {
          const classInfo = formConfig.availableClasses.find((item) => item.id === classId);
          const schedules = classInfo?.schedules || [];
          if (schedules.length === 0) return [classId];

          if (recurringMode === "linked") {
            return schedules.map((schedule) => `${classId}::${schedule.id}`);
          }

          return [`${classId}::${schedules[0].id}`];
        });

        setSelectedClassIds(mappedSelection);
      }
    }

    const firstName = (searchParams.get("first_name") || "").trim();
    const lastName = (searchParams.get("last_name") || "").trim();
    const email = (searchParams.get("email") || "").trim();
    const phone = (searchParams.get("phone") || "").trim();
    const guardianName = (searchParams.get("guardian_name") || "").trim();
    const guardianEmail = (searchParams.get("guardian_email") || "").trim();
    const guardianPhone = (searchParams.get("guardian_phone") || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();

    const smartData = {
      firstName,
      lastName,
      email,
      phone,
      guardianName,
      guardianEmail,
      guardianPhone,
      fullName,
    };

    const valueForFieldId = (fieldId: string, source: typeof smartData) => {
      const key = fieldId.toLowerCase();

      if (key.includes("guardian") || key.includes("tutor") || key.includes("payer") || key.includes("responsable")) {
        if (key.includes("email")) return source.guardianEmail || source.email;
        if (key.includes("phone") || key.includes("tel")) return source.guardianPhone || source.phone;
        if (key.includes("name") || key.includes("nombre")) return source.guardianName || source.fullName;
      }

      if (key.includes("first_name") || key.includes("nombre") || key.includes("name")) {
        if (key.includes("last")) return source.lastName;
        if (key.includes("first")) return source.firstName;
        return source.fullName;
      }

      if (key.includes("last_name") || key.includes("apellido")) return source.lastName;
      if (key.includes("email")) return source.email;
      if (key.includes("phone") || key.includes("tel")) return source.phone;

      return "";
    };

    const presetValues: Record<string, unknown> = {};
    const mappableParams: Array<{ query: string; fieldId: string }> = [
      { query: "first_name", fieldId: "first_name" },
      { query: "last_name", fieldId: "last_name" },
      { query: "email", fieldId: "email" },
      { query: "phone", fieldId: "phone" },
      { query: "guardian_name", fieldId: "guardian_name" },
      { query: "guardian_email", fieldId: "guardian_email" },
      { query: "guardian_phone", fieldId: "guardian_phone" },
    ];

    for (const mapItem of mappableParams) {
      const value = searchParams.get(mapItem.query);
      if (value && value.trim().length > 0) {
        presetValues[mapItem.fieldId] = value.trim();
      }
    }

    if (Object.keys(presetValues).length > 0) {
      setValues((prev) => ({ ...presetValues, ...prev }));
    }

    if (isJointEnrollmentEnabled) {
      const payerDefaults = (payerSection?.fields || []).reduce<Record<string, unknown>>((acc, field) => {
        const nextValue = valueForFieldId(field.id, smartData);
        if (typeof nextValue === "string" && nextValue.length > 0) {
          acc[field.id] = nextValue;
        }
        return acc;
      }, {});

      if (Object.keys(payerDefaults).length > 0) {
        setPayerValues((prev) => ({ ...payerDefaults, ...prev }));
      }

      const studentFields = studentSections.flatMap((section) => section.fields || []);
      const studentDefaults = studentFields.reduce<Record<string, unknown>>((acc, field) => {
        const nextValue = valueForFieldId(field.id, smartData);
        if (typeof nextValue === "string" && nextValue.length > 0) {
          acc[field.id] = nextValue;
        }
        return acc;
      }, {});

      if (Object.keys(studentDefaults).length > 0) {
        setJointStudents((prev) => {
          if (prev.length === 0) {
            return [{ id: "student-1", values: studentDefaults, selectedClassIds: validSelection, errors: {} }];
          }

          const [first, ...rest] = prev;
          return [{ ...first, values: { ...studentDefaults, ...first.values } }, ...rest];
        });
      }
    }

    setSmartDefaultsApplied(true);
  }, [formConfig, isJointEnrollmentEnabled, payerSection, searchParams, smartDefaultsApplied, studentSections]);

  const visibleSections = useMemo(() => {
    const config: EnrollmentFormConfig | undefined = formConfig?.formConfig;
    if (!config?.sections) return [];
    return config.sections.filter((section) => isVisible(section.conditions, values));
  }, [formConfig, values]);

  const selectedClasses = useMemo(() => {
    if (!formConfig) return [];
    const classIds = isJointEnrollmentEnabled
      ? Array.from(new Set(jointStudents.flatMap((student) => student.selectedClassIds)))
      : selectedClassIds;
    return formConfig.availableClasses.filter((item) => classIds.includes(item.id) || classIds.some((selectionId) => selectionIdToClassId(selectionId) === item.id));
  }, [formConfig, isJointEnrollmentEnabled, jointStudents, selectedClassIds]);

  const selectedPricingClasses = useMemo(() => {
    if (!formConfig) return [];

    if (!isJointEnrollmentEnabled) {
      return selectedClassIds.map((selectionId) => {
        const classId = selectionIdToClassId(selectionId);
        const scheduleId = selectionIdToScheduleId(selectionId);
        const item = formConfig.availableClasses.find((entry) => entry.id === classId);
        if (!item) return null;

        const schedule = item.schedules?.find((entry) => entry.id === scheduleId) || item.schedules?.[0];
        return {
          id: selectionId,
          pricingClassId: classId,
          pricingScheduleId: schedule?.id,
          name: item.name,
          price: item.price_cents / 100,
          day: schedule?.day,
          time: schedule ? `${schedule.startHour}:00` : undefined,
        };
      }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    }

    const classMap = new Map(formConfig.availableClasses.map((item) => [item.id, item]));

    return jointStudents.flatMap((student, index) => {
      const studentName = String(student.values.first_name || student.values.name || `Alumno ${index + 1}`);
      return student.selectedClassIds
        .map((selectionId) => {
          const classId = selectionIdToClassId(selectionId);
          const scheduleId = selectionIdToScheduleId(selectionId);
          const classInfo = classMap.get(classId);
          if (!classInfo) return null;

          const schedule = classInfo.schedules?.find((item) => item.id === scheduleId) || classInfo.schedules?.[0];
          const totalHours = (classInfo.schedules || []).reduce((sum, item) => sum + item.duration, 0) || 1;
          const slotHours = schedule?.duration || totalHours;
          const proportionalPrice = (classInfo.price_cents / 100) * (slotHours / totalHours);
          return {
            id: `${student.id}::${selectionId}`,
            pricingClassId: classId,
            pricingScheduleId: schedule?.id,
            name: `${classInfo.name} - ${studentName}`,
            price: proportionalPrice,
            day: schedule?.day,
            time: schedule ? `${schedule.startHour}:00` : undefined,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    });
  }, [formConfig, isJointEnrollmentEnabled, jointStudents, selectedClasses]);

  const effectivePublicScheduleConfig = useMemo(() => {
    const formBuilderConfig = formConfig?.formConfig.scheduleSettings ?? formConfig?.formConfig.jointEnrollment?.schedule;
    const settingsConfig = formConfig?.scheduleConfig;

    if (!formBuilderConfig) return undefined;

    return {
      ...formBuilderConfig,
      recurringSelectionMode: normalizeRecurringMode(settingsConfig?.recurringSelectionMode) ?? formBuilderConfig.recurringSelectionMode,
      startHour: settingsConfig?.startHour,
      endHour: settingsConfig?.endHour,
    };
  }, [formConfig]);

  const toggleClass = (selectionId: string, linkedSelectionIds?: string[]) => {
    setSelectedClassIds((prev) => {
      if (linkedSelectionIds && linkedSelectionIds.length > 0) {
        const hasAny = linkedSelectionIds.some((id) => prev.includes(id));
        return hasAny
          ? prev.filter((id) => !linkedSelectionIds.includes(id))
          : Array.from(new Set([...prev, ...linkedSelectionIds]));
      }

      const next = prev.includes(selectionId) ? prev.filter((id) => id !== selectionId) : [...prev, selectionId];
      return next;
    });
    if (errors.class_id) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.class_id;
        return next;
      });
    }
  };

  const validate = () => {
    if (isJointEnrollmentEnabled) {
      const nextPayerErrors: Record<string, string> = {};

      if (payerSection) {
        payerSection.fields.forEach((field) => {
          if (!isVisible(field.conditions, payerValues)) return;
          const raw = payerValues[field.id];

          if (field.required && isBlank(raw)) {
            nextPayerErrors[field.id] = "Este campo es obligatorio";
            return;
          }

          if (field.type === "email" && !isBlank(raw) && !isValidEmail(raw)) {
            nextPayerErrors[field.id] = "Email invalido";
            return;
          }

          if (field.maxLength && typeof raw === "string" && raw.length > field.maxLength) {
            nextPayerErrors[field.id] = `Maximo ${field.maxLength} caracteres`;
          }
        });
      }

      const nextStudents = jointStudents.map((student) => {
        const nextStudentErrors: Record<string, string> = {};

        if (student.selectedClassIds.length === 0) {
          nextStudentErrors.class_id = "Debe seleccionar al menos una clase";
        }

        studentSections.forEach((section) => {
          if (!isVisible(section.conditions, student.values)) return;
          section.fields.forEach((field) => {
            if (!isVisible(field.conditions, student.values)) return;
            const raw = student.values[field.id];

            if (field.required && isBlank(raw)) {
              nextStudentErrors[field.id] = "Este campo es obligatorio";
              return;
            }

            if (field.type === "email" && !isBlank(raw) && !isValidEmail(raw)) {
              nextStudentErrors[field.id] = "Email invalido";
              return;
            }

            if (field.maxLength && typeof raw === "string" && raw.length > field.maxLength) {
              nextStudentErrors[field.id] = `Maximo ${field.maxLength} caracteres`;
            }
          });
        });

        return { ...student, errors: nextStudentErrors };
      });

      setPayerErrors(nextPayerErrors);
      setJointStudents(nextStudents);

      const hasPayerErrors = Object.keys(nextPayerErrors).length > 0;
      const hasStudentErrors = nextStudents.some((student) => Object.keys(student.errors).length > 0);
      return !hasPayerErrors && !hasStudentErrors;
    }

    const nextErrors: Record<string, string> = {};

    if (selectedClassIds.length === 0) {
      nextErrors.class_id = "Debe seleccionar una clase";
    }

    visibleSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (!isVisible(field.conditions, values)) return;
        const raw = values[field.id];

        if (field.required && isBlank(raw)) {
          nextErrors[field.id] = "Este campo es obligatorio";
          return;
        }

        if (field.type === "email" && !isBlank(raw) && !isValidEmail(raw)) {
          nextErrors[field.id] = "Email invalido";
          return;
        }

        if (field.maxLength && typeof raw === "string" && raw.length > field.maxLength) {
          nextErrors[field.id] = `Maximo ${field.maxLength} caracteres`;
        }
      });
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tenantSlug || !validate()) {
      return;
    }

    setSubmitting(true);
    try {
      if (isJointEnrollmentEnabled) {
        const payerType = String(payerValues.payer_type || "other");
        const firstStudentInfo = extractStudentInfo(jointStudents[0]?.values || {});
        const explicitPayer = extractPayerInfo(payerValues);
        const payerInfo =
          payerType === "student"
            ? {
                name: firstStudentInfo.name,
                email: firstStudentInfo.email,
                phone: firstStudentInfo.phone,
              }
            : payerType === "guardian"
              ? {
                  name: firstStudentInfo.guardianName || firstStudentInfo.name,
                  email: firstStudentInfo.guardianEmail || firstStudentInfo.email,
                  phone: firstStudentInfo.guardianPhone || firstStudentInfo.phone,
                }
              : explicitPayer;
        if (!payerInfo.name || !payerInfo.email || !payerInfo.phone) {
          toast.error("Completa nombre, email y telefono del responsable");
          setSubmitting(false);
          return;
        }

        const firstSelectedClassId = selectionIdToClassId(jointStudents[0]?.selectedClassIds[0] || "");

        const response = await submitPublicEnrollment(tenantSlug, {
          is_joint_enrollment: true,
          payer_info: payerInfo,
          form_values: payerValues,
          students: jointStudents.map((student) => ({
            form_values: student.values,
            class_ids: Array.from(new Set(student.selectedClassIds.map(selectionIdToClassId))),
            class_selections: student.selectedClassIds.map((selectionId) => ({
              class_id: selectionIdToClassId(selectionId),
              schedule_id: selectionIdToScheduleId(selectionId) || undefined,
            })),
          })),
          class_ids: Array.from(new Set(jointStudents.flatMap((student) => student.selectedClassIds.map(selectionIdToClassId)))),
          class_id: firstSelectedClassId || undefined,
        });

        setSuccess(true);
        toast.success(response?.message || "Inscripción enviada exitosamente");
      } else {
        const selectedClassIdsUnique = Array.from(new Set(selectedClassIds.map(selectionIdToClassId)));
        const response = await submitPublicEnrollment(tenantSlug, {
          class_id: selectedClassIdsUnique[0],
          class_ids: selectedClassIdsUnique,
          class_selections: selectedClassIds.map((selectionId) => ({
            class_id: selectionIdToClassId(selectionId),
            schedule_id: selectionIdToScheduleId(selectionId) || undefined,
          })),
          form_values: values,
        });

        setSuccess(true);
        toast.success(response?.message || "Inscripción enviada exitosamente");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al enviar la inscripción");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Escuela no encontrada</CardTitle>
            <CardDescription>
              La escuela que estas buscando no esta disponible o esta inactiva.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Inscripción enviada</CardTitle>
            <CardDescription className="text-base mt-2">
              Tu solicitud de inscripción fue recibida correctamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.reload()}>
              Hacer otra inscripción
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{formConfig.tenantName}</h1>
          <p className="text-muted-foreground text-lg">Formulario de Matrícula</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isJointEnrollmentEnabled ? (
            <JointEnrollmentForm
              sections={formConfig.formConfig.sections}
              availableClasses={formConfig.availableClasses}
              jointConfig={formConfig.formConfig.jointEnrollment}
              scheduleSettings={formConfig.formConfig.scheduleSettings ?? formConfig.formConfig.jointEnrollment?.schedule}
              payerValues={payerValues}
              payerErrors={payerErrors}
              students={jointStudents}
              onStudentsChange={setJointStudents}
              onPayerChange={setPayerValues}
              onPayerErrorChange={setPayerErrors}
              renderField={renderField}
              isVisible={isVisible}
              maxStudents={formConfig.formConfig.jointEnrollment.maxStudents}
            />
          ) : (
            <>
              {visibleSections.map((section, index) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle>{index + 1}. {section.title}</CardTitle>
                    {section.description ? <CardDescription>{section.description}</CardDescription> : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.fields
                      .filter((field) => isVisible(field.conditions, values))
                      .map((field) => (
                        <div key={field.id} className="space-y-2">
                          {field.type !== "checkbox" && field.type !== "info" ? (
                            <Label>{`${field.label}${field.required ? " *" : ""}`}</Label>
                          ) : field.type === "checkbox" && field.placeholder ? (
                            <Label>{`${field.label}${field.required ? " *" : ""}`}</Label>
                          ) : null}
                          {renderField(field, values, setValues, errors, setErrors)}
                          {errors[field.id] ? <p className="text-xs text-destructive">{errors[field.id]}</p> : null}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              ))}
              {formConfig.formConfig.includeSchedule ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Selección de Clase y Horario</CardTitle>
                    <CardDescription>Elige la clase y el horario en el que deseas inscribirte</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PublicScheduleSelector
                      classes={formConfig.availableClasses}
                      selectedClassIds={selectedClassIds}
                      onToggleClass={toggleClass}
                      error={errors.class_id}
                      scheduleConfig={effectivePublicScheduleConfig}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Selección de Clase</CardTitle>
                    <CardDescription>Elige la clase en la que deseas inscribirte</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Clases *</Label>
                      <div className="space-y-2 rounded-lg border p-3 max-h-72 overflow-auto">
                        {formConfig.availableClasses.map((item) => {
                          const isFull = item.enrolled_count >= item.capacity;
                          const checked = selectedClassIds.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className={`flex items-center justify-between gap-3 rounded-md px-2 py-2 border ${checked ? "border-primary bg-primary/5" : "border-transparent"} ${isFull ? "opacity-50" : "cursor-pointer"}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => !isFull && toggleClass(item.id)}
                                  disabled={isFull}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.discipline} - {item.category}</p>
                                </div>
                              </div>
                              <div className="text-right text-xs">
                                <p className="font-semibold">€{(item.price_cents / 100).toFixed(2)}</p>
                                <p className={isFull ? "text-destructive" : "text-muted-foreground"}>
                                  {item.enrolled_count}/{item.capacity}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      {errors.class_id && <p className="text-xs text-destructive">{errors.class_id}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {(formConfig.formConfig.includePricing ?? true) && (
            <DynamicPricingSummary
              tenantId={formConfig.tenantId}
              selectedClasses={selectedPricingClasses}
              onRemoveClass={(id) => {
                if (!isJointEnrollmentEnabled) {
                  toggleClass(id);
                  return;
                }

                const [studentId, ...selectionParts] = id.split("::");
                const selectionId = selectionParts.join("::");
                if (!studentId || !selectionId) return;

                setJointStudents((prev) =>
                  prev.map((student) =>
                    student.id === studentId
                      ? {
                          ...student,
                          selectedClassIds: student.selectedClassIds.filter((current) => current !== selectionId),
                        }
                      : student
                  )
                );
              }}
            />
          )}

          

          <div className="flex justify-center pt-4">
            <Button type="submit" size="lg" disabled={submitting} className="w-full md:w-auto px-12">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? "Enviando..." : "Enviar Matrícula"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
