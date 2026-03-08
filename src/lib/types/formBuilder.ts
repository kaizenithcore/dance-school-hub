export type FieldType = "text" | "email" | "tel" | "textarea" | "select" | "checkbox" | "file" | "date" | "number";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldCondition {
  id: string;
  sourceFieldId: string;
  operator: "equals" | "not_equals" | "less_than" | "greater_than" | "contains" | "is_empty" | "is_not_empty";
  value: string;
}

export interface FormBuilderField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
  accept?: string;
  maxLength?: number;
  conditions?: FieldCondition[];
}

export interface FormBuilderSection {
  id: string;
  title: string;
  description?: string;
  fields: FormBuilderField[];
  conditions?: FieldCondition[];
}

export interface JointEnrollmentConfig {
  enabled: boolean;
  maxStudents: number;
  schedule?: {
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

export interface EnrollmentFormConfig {
  sections: FormBuilderSection[];
  jointEnrollment: JointEnrollmentConfig;
  includeSchedule: boolean;
  includePricing: boolean;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto",
  email: "Correo",
  tel: "Teléfono",
  textarea: "Texto largo",
  select: "Selector",
  checkbox: "Casilla",
  file: "Archivo",
  date: "Fecha",
  number: "Número",
};

export const OPERATOR_LABELS: Record<FieldCondition["operator"], string> = {
  equals: "es igual a",
  not_equals: "no es igual a",
  less_than: "es menor que",
  greater_than: "es mayor que",
  contains: "contiene",
  is_empty: "está vacío",
  is_not_empty: "no está vacío",
};

export function createDefaultField(type: FieldType = "text"): FormBuilderField {
  const id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const base: FormBuilderField = {
    id,
    type,
    label: FIELD_TYPE_LABELS[type],
    required: false,
  };
  if (type === "select") {
    base.options = [{ value: "option_1", label: "Opción 1" }];
  }
  if (type === "file") {
    base.accept = ".pdf,.jpg,.jpeg,.png";
  }
  return base;
}

export function createDefaultSection(): FormBuilderSection {
  return {
    id: `section_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: "Nueva Sección",
    fields: [],
  };
}

// Default config matching existing enrollment schema
export function getDefaultEnrollmentConfig(): EnrollmentFormConfig {
  return {
    sections: [
      {
        id: "student",
        title: "Información del Alumno",
        description: "Datos personales del alumno que se inscribe.",
        fields: [
          { id: "student_name", type: "text", label: "Nombre completo", placeholder: "Ej: María López", required: true, maxLength: 100 },
          { id: "student_email", type: "email", label: "Correo electrónico", placeholder: "maria@ejemplo.com", required: true, maxLength: 255 },
          { id: "student_phone", type: "tel", label: "Teléfono", placeholder: "(011) 1234-5678", required: true, maxLength: 20 },
          { id: "student_birthdate", type: "date", label: "Fecha de nacimiento", required: true },
          { id: "student_level", type: "select", label: "Nivel de experiencia", required: true, options: [
            { value: "beginner", label: "Principiante" },
            { value: "intermediate", label: "Intermedio" },
            { value: "advanced", label: "Avanzado" },
          ]},
        ],
      },
      {
        id: "guardian",
        title: "Información del Tutor",
        description: "Requerido para alumnos menores de 18 años.",
        fields: [
          { id: "guardian_name", type: "text", label: "Nombre del tutor", placeholder: "Nombre completo", required: false, maxLength: 100 },
          { id: "guardian_phone", type: "tel", label: "Teléfono del tutor", placeholder: "(011) 1234-5678", required: false, maxLength: 20 },
          { id: "guardian_email", type: "email", label: "Correo del tutor", placeholder: "tutor@ejemplo.com", required: false, maxLength: 255 },
        ],
        conditions: [
          { id: "cond_guardian_age", sourceFieldId: "student_birthdate", operator: "less_than", value: "18" },
        ],
      },
      {
        id: "payment",
        title: "Método de Pago",
        description: "Selecciona cómo prefieres realizar el pago.",
        fields: [
          { id: "payment_method", type: "select", label: "Método de pago", required: true, options: [
            { value: "transfer", label: "Transferencia bancaria" },
            { value: "cash", label: "Efectivo" },
            { value: "card", label: "Tarjeta de crédito/débito" },
            { value: "mercadopago", label: "Mercado Pago" },
          ]},
        ],
      },
      {
        id: "additional",
        title: "Información Adicional",
        fields: [
          { id: "medical_notes", type: "textarea", label: "Condiciones médicas o alergias", placeholder: "Indicá cualquier condición relevante...", required: false, maxLength: 500 },
          { id: "how_found", type: "select", label: "¿Cómo nos conociste?", required: false, options: [
            { value: "social", label: "Redes sociales" },
            { value: "friend", label: "Recomendación" },
            { value: "search", label: "Búsqueda en internet" },
            { value: "other", label: "Otro" },
          ]},
          { id: "terms", type: "checkbox", label: "Acepto los términos y condiciones de inscripción", required: true },
        ],
      },
      {
        id: "documents",
        title: "Documentos",
        description: "Adjuntá los documentos requeridos (opcional).",
        fields: [
          { id: "id_document", type: "file", label: "Documento de identidad (DNI)", required: false, accept: ".pdf,.jpg,.jpeg,.png" },
          { id: "medical_cert", type: "file", label: "Certificado médico", required: false, accept: ".pdf,.jpg,.jpeg,.png" },
        ],
      },
    ],
    jointEnrollment: {
      enabled: false,
      maxStudents: 3,
      schedule: {
        preferredView: "calendar",
        recurringSelectionMode: "linked",
        recurringClassOverrides: [],
        calendarFields: {
          showDiscipline: true,
          showCategory: false,
          showRoom: true,
          showCapacity: true,
          showPrice: true,
          showSelectedStudents: true,
        },
      },
    },
    includeSchedule: true,
    includePricing: true,
  };
}
