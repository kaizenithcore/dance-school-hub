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
    }
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
} as const;
