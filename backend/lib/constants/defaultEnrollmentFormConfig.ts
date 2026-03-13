export const defaultEnrollmentFormConfig = {
  sections: [
    {
      id: "student",
      title: "Informacion del Alumno",
      description: "Datos personales del alumno que se inscribe.",
      fields: [
        {
          id: "student_name",
          type: "text",
          label: "Nombre completo",
          placeholder: "Ej: Maria Lopez",
          required: true,
          maxLength: 100,
        },
        {
          id: "student_email",
          type: "email",
          label: "Correo electronico",
          placeholder: "maria@ejemplo.com",
          required: true,
          maxLength: 255,
        },
        {
          id: "student_phone",
          type: "tel",
          label: "Telefono",
          placeholder: "(011) 1234-5678",
          required: false,
          maxLength: 20,
        },
        {
          id: "student_birthdate",
          type: "date",
          label: "Fecha de nacimiento",
          required: false,
        }
      ],
    },
    {
      id: "guardian",
      title: "Informacion del Tutor",
      description: "Requerido para alumnos menores de 18 anos.",
      fields: [
        {
          id: "guardian_name",
          type: "text",
          label: "Nombre del tutor",
          placeholder: "Nombre completo",
          required: false,
          maxLength: 100,
        },
        {
          id: "guardian_phone",
          type: "tel",
          label: "Telefono del tutor",
          placeholder: "(011) 1234-5678",
          required: false,
          maxLength: 20,
        },
        {
          id: "guardian_email",
          type: "email",
          label: "Correo del tutor",
          placeholder: "tutor@ejemplo.com",
          required: false,
          maxLength: 255,
        }
      ],
      conditions: [
        {
          id: "cond_guardian_age",
          sourceFieldId: "student_birthdate",
          operator: "date_after",
          value: "today_minus_18y",
        },
      ],
    },
    {
      id: "payer_info",
      title: "Datos del Pagador y Forma de Pago",
      description: "Permite usar datos del alumno, tutor o de otra persona.",
      fields: [
        {
          id: "payer_type",
          type: "select",
          label: "Quien realiza el pago",
          required: true,
          options: [
            { value: "student", label: "El propio alumno" },
            { value: "guardian", label: "Tutor o responsable" },
            { value: "other", label: "Otra persona" },
          ],
        },
        {
          id: "payer_name",
          type: "text",
          label: "Nombre del pagador",
          placeholder: "Solo si paga otra persona",
          required: false,
          maxLength: 100,
          conditions: [
            { id: "cond_payer_name_other", sourceFieldId: "payer_type", operator: "equals", value: "other" },
          ],
        },
        {
          id: "payer_email",
          type: "email",
          label: "Correo del pagador",
          placeholder: "pagador@ejemplo.com",
          required: false,
          maxLength: 255,
          conditions: [
            { id: "cond_payer_email_other", sourceFieldId: "payer_type", operator: "equals", value: "other" },
          ],
        },
        {
          id: "payer_phone",
          type: "tel",
          label: "Telefono del pagador",
          placeholder: "(011) 1234-5678",
          required: false,
          maxLength: 20,
          conditions: [
            { id: "cond_payer_phone_other", sourceFieldId: "payer_type", operator: "equals", value: "other" },
          ],
        },
        {
          id: "payment_method",
          type: "select",
          label: "Método de pago",
          required: true,
          options: [
            { value: "transfer", label: "Transferencia bancaria" },
            { value: "cash", label: "Efectivo" },
            { value: "card", label: "Tarjeta de crédito/débito" },
            { value: "mercadopago", label: "Mercado Pago" },
          ],
        },
      ],
    }
  ],
  jointEnrollment: {
    enabled: false,
    maxStudents: 3,
  },
  includeSchedule: true,
  includePricing: true,
  scheduleSettings: {
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
} as const;
