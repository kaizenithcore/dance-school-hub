export interface FormFieldConfig {
  id: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "checkbox" | "file" | "date" | "number";
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  accept?: string; // for file fields
  maxLength?: number;
}

export interface FormSectionConfig {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldConfig[];
}

// Default enrollment form schema — this would come from the backend in production
export const DEFAULT_ENROLLMENT_SCHEMA: FormSectionConfig[] = [
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
      { id: "guardian_name", type: "text", label: "Nombre del tutor", placeholder: "Nombre completo del tutor", maxLength: 100 },
      { id: "guardian_phone", type: "tel", label: "Teléfono del tutor", placeholder: "(011) 1234-5678", maxLength: 20 },
      { id: "guardian_email", type: "email", label: "Correo del tutor", placeholder: "tutor@ejemplo.com", maxLength: 255 },
    ],
  },
  {
    id: "payment",
    title: "Método de Pago",
    description: "Seleccioná cómo preferís realizar el pago.",
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
      { id: "medical_notes", type: "textarea", label: "Condiciones médicas o alergias", placeholder: "Indicá cualquier condición médica relevante...", maxLength: 500 },
      { id: "how_found", type: "select", label: "¿Cómo nos conociste?", options: [
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
      { id: "id_document", type: "file", label: "Documento de identidad (DNI)", accept: ".pdf,.jpg,.jpeg,.png" },
      { id: "medical_cert", type: "file", label: "Certificado médico", accept: ".pdf,.jpg,.jpeg,.png" },
    ],
  },
];
