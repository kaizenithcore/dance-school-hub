export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  locality?: string;
  identityDocumentType?: "dni" | "passport";
  identityDocumentNumber?: string;
  birthdate: string;
  enrolledClasses: {
    id: string;
    name: string;
    day: string;
    time: string;
    monthlyPrice: number;
    selectedScheduleIds?: string[];
  }[];
  status: "active" | "inactive";
  joinDate: string;
  guardian?: { name: string; phone: string; email: string };
  notes?: string;
  paymentType: "monthly" | "per_class" | "none";
  payerType?: "student" | "guardian" | "other";
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  preferredPaymentMethod?: "transfer" | "cash" | "card" | "mercadopago";
  accountNumber?: string;
  jointEnrollmentGroupId?: string | null;
  monthlyTotalOverride?: number;
  extraData?: Record<string, unknown>;
}

export const MOCK_STUDENTS: StudentRecord[] = [
  {
    id: "s1", name: "María Santos", email: "maria@ejemplo.com", phone: "(011) 5555-1234", birthdate: "2002-03-15",
    enrolledClasses: [
      { id: "1", name: "Ballet Principiantes", day: "Lunes", time: "09:00–10:30", monthlyPrice: 85 },
      { id: "2", name: "Danza Contemporánea", day: "Lunes", time: "11:00–12:30", monthlyPrice: 90 },
    ],
    status: "active", joinDate: "2025-08-10", paymentType: "monthly",
  },
  {
    id: "s2", name: "João Silva", email: "joao@ejemplo.com", phone: "(011) 5555-2345", birthdate: "1998-07-22",
    enrolledClasses: [
      { id: "5", name: "Ballet Avanzado", day: "Jueves", time: "10:00–11:30", monthlyPrice: 95 },
    ],
    status: "active", joinDate: "2025-06-01", paymentType: "monthly",
  },
  {
    id: "s3", name: "Ana Oliveira", email: "ana@ejemplo.com", phone: "(011) 5555-3456", birthdate: "2010-11-08",
    enrolledClasses: [
      { id: "3", name: "Hip Hop Niños", day: "Martes", time: "15:00–16:00", monthlyPrice: 65 },
    ],
    status: "active", joinDate: "2025-09-15", paymentType: "monthly",
    guardian: { name: "Laura Oliveira", phone: "(011) 5555-9999", email: "laura@ejemplo.com" },
  },
  {
    id: "s4", name: "Carlos Méndez", email: "carlos@ejemplo.com", phone: "(011) 5555-4567", birthdate: "1995-01-30",
    enrolledClasses: [
      { id: "6", name: "Salsa y Bachata", day: "Viernes", time: "19:00–20:30", monthlyPrice: 80 },
      { id: "7", name: "Tango Intensivo", day: "Sábado", time: "16:00–18:00", monthlyPrice: 120 },
    ],
    status: "active", joinDate: "2025-04-20", paymentType: "monthly",
  },
  {
    id: "s5", name: "Lucía Fernández", email: "lucia@ejemplo.com", phone: "(011) 5555-5678", birthdate: "2000-09-12",
    enrolledClasses: [
      { id: "8", name: "Danza Moderna", day: "Miércoles", time: "09:00–10:30", monthlyPrice: 90 },
      { id: "9", name: "Stretching & Barre", day: "Viernes", time: "08:00–09:00", monthlyPrice: 50 },
    ],
    status: "active", joinDate: "2025-07-05", paymentType: "per_class",
  },
  {
    id: "s6", name: "Diego Ramírez", email: "diego@ejemplo.com", phone: "(011) 5555-6789", birthdate: "2001-05-18",
    enrolledClasses: [
      { id: "4", name: "Jazz Fusión", day: "Miércoles", time: "18:00–19:30", monthlyPrice: 90 },
    ],
    status: "active", joinDate: "2025-03-12", paymentType: "monthly",
  },
  {
    id: "s7", name: "Valentina Torres", email: "vale@ejemplo.com", phone: "(011) 5555-7890", birthdate: "1997-12-25",
    enrolledClasses: [
      { id: "1", name: "Ballet Principiantes", day: "Lunes", time: "09:00–10:30", monthlyPrice: 85 },
      { id: "6", name: "Salsa y Bachata", day: "Viernes", time: "19:00–20:30", monthlyPrice: 80 },
      { id: "10", name: "Folklore", day: "Sábado", time: "10:00–11:30", monthlyPrice: 75 },
    ],
    status: "active", joinDate: "2025-02-28", paymentType: "monthly",
  },
  {
    id: "s8", name: "Mateo López", email: "mateo@ejemplo.com", phone: "(011) 5555-8901", birthdate: "2003-08-04",
    enrolledClasses: [],
    status: "inactive", joinDate: "2025-05-15", paymentType: "none",
    notes: "Se dio de baja por mudanza. Podría volver el próximo semestre.",
  },
  {
    id: "s9", name: "Sofía Herrera", email: "sofia@ejemplo.com", phone: "(011) 5555-9012", birthdate: "2012-02-14",
    enrolledClasses: [
      { id: "3", name: "Hip Hop Niños", day: "Martes", time: "15:00–16:00", monthlyPrice: 65 },
    ],
    status: "active", joinDate: "2026-01-10", paymentType: "monthly",
    guardian: { name: "Pedro Herrera", phone: "(011) 5555-0000", email: "pedro@ejemplo.com" },
  },
  {
    id: "s10", name: "Nicolás Acosta", email: "nico@ejemplo.com", phone: "(011) 5555-0123", birthdate: "1999-06-20",
    enrolledClasses: [
      { id: "5", name: "Ballet Avanzado", day: "Jueves", time: "10:00–11:30", monthlyPrice: 95 },
      { id: "2", name: "Danza Contemporánea", day: "Lunes", time: "11:00–12:30", monthlyPrice: 90 },
    ],
    status: "active", joinDate: "2025-10-01", paymentType: "monthly",
  },
  {
    id: "s11", name: "Camila Vega", email: "camila@ejemplo.com", phone: "(011) 5555-1111", birthdate: "2004-04-09",
    enrolledClasses: [
      { id: "8", name: "Danza Moderna", day: "Miércoles", time: "09:00–10:30", monthlyPrice: 90 },
    ],
    status: "inactive", joinDate: "2025-01-20", paymentType: "monthly",
    notes: "Pausó temporalmente por lesión.",
  },
  {
    id: "s12", name: "Tomás Ruiz", email: "tomas@ejemplo.com", phone: "(011) 5555-2222", birthdate: "1996-10-30",
    enrolledClasses: [
      { id: "7", name: "Tango Intensivo", day: "Sábado", time: "16:00–18:00", monthlyPrice: 120 },
    ],
    status: "active", joinDate: "2025-11-05", paymentType: "per_class",
  },
];
