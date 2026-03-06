export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthdate: string;
  enrolledClasses: { id: string; name: string; day: string; time: string }[];
  status: "active" | "inactive";
  joinDate: string;
  guardian?: { name: string; phone: string; email: string };
  notes?: string;
}

export const MOCK_STUDENTS: StudentRecord[] = [
  {
    id: "s1", name: "María Santos", email: "maria@ejemplo.com", phone: "(011) 5555-1234", birthdate: "2002-03-15",
    enrolledClasses: [
      { id: "1", name: "Ballet Principiantes", day: "Lunes", time: "09:00–10:30" },
      { id: "2", name: "Danza Contemporánea", day: "Lunes", time: "11:00–12:30" },
    ],
    status: "active", joinDate: "2025-08-10",
  },
  {
    id: "s2", name: "João Silva", email: "joao@ejemplo.com", phone: "(011) 5555-2345", birthdate: "1998-07-22",
    enrolledClasses: [
      { id: "5", name: "Ballet Avanzado", day: "Jueves", time: "10:00–11:30" },
    ],
    status: "active", joinDate: "2025-06-01",
  },
  {
    id: "s3", name: "Ana Oliveira", email: "ana@ejemplo.com", phone: "(011) 5555-3456", birthdate: "2010-11-08",
    enrolledClasses: [
      { id: "3", name: "Hip Hop Niños", day: "Martes", time: "15:00–16:00" },
    ],
    status: "active", joinDate: "2025-09-15",
    guardian: { name: "Laura Oliveira", phone: "(011) 5555-9999", email: "laura@ejemplo.com" },
  },
  {
    id: "s4", name: "Carlos Méndez", email: "carlos@ejemplo.com", phone: "(011) 5555-4567", birthdate: "1995-01-30",
    enrolledClasses: [
      { id: "6", name: "Salsa y Bachata", day: "Viernes", time: "19:00–20:30" },
      { id: "7", name: "Tango Intensivo", day: "Sábado", time: "16:00–18:00" },
    ],
    status: "active", joinDate: "2025-04-20",
  },
  {
    id: "s5", name: "Lucía Fernández", email: "lucia@ejemplo.com", phone: "(011) 5555-5678", birthdate: "2000-09-12",
    enrolledClasses: [
      { id: "8", name: "Danza Moderna", day: "Miércoles", time: "09:00–10:30" },
      { id: "9", name: "Stretching & Barre", day: "Viernes", time: "08:00–09:00" },
    ],
    status: "active", joinDate: "2025-07-05",
  },
  {
    id: "s6", name: "Diego Ramírez", email: "diego@ejemplo.com", phone: "(011) 5555-6789", birthdate: "2001-05-18",
    enrolledClasses: [
      { id: "4", name: "Jazz Fusión", day: "Miércoles", time: "18:00–19:30" },
    ],
    status: "active", joinDate: "2025-03-12",
  },
  {
    id: "s7", name: "Valentina Torres", email: "vale@ejemplo.com", phone: "(011) 5555-7890", birthdate: "1997-12-25",
    enrolledClasses: [
      { id: "1", name: "Ballet Principiantes", day: "Lunes", time: "09:00–10:30" },
      { id: "6", name: "Salsa y Bachata", day: "Viernes", time: "19:00–20:30" },
      { id: "10", name: "Folklore", day: "Sábado", time: "10:00–11:30" },
    ],
    status: "active", joinDate: "2025-02-28",
  },
  {
    id: "s8", name: "Mateo López", email: "mateo@ejemplo.com", phone: "(011) 5555-8901", birthdate: "2003-08-04",
    enrolledClasses: [],
    status: "inactive", joinDate: "2025-05-15",
    notes: "Se dio de baja por mudanza. Podría volver el próximo semestre.",
  },
  {
    id: "s9", name: "Sofía Herrera", email: "sofia@ejemplo.com", phone: "(011) 5555-9012", birthdate: "2012-02-14",
    enrolledClasses: [
      { id: "3", name: "Hip Hop Niños", day: "Martes", time: "15:00–16:00" },
    ],
    status: "active", joinDate: "2026-01-10",
    guardian: { name: "Pedro Herrera", phone: "(011) 5555-0000", email: "pedro@ejemplo.com" },
  },
  {
    id: "s10", name: "Nicolás Acosta", email: "nico@ejemplo.com", phone: "(011) 5555-0123", birthdate: "1999-06-20",
    enrolledClasses: [
      { id: "5", name: "Ballet Avanzado", day: "Jueves", time: "10:00–11:30" },
      { id: "2", name: "Danza Contemporánea", day: "Lunes", time: "11:00–12:30" },
    ],
    status: "active", joinDate: "2025-10-01",
  },
  {
    id: "s11", name: "Camila Vega", email: "camila@ejemplo.com", phone: "(011) 5555-1111", birthdate: "2004-04-09",
    enrolledClasses: [
      { id: "8", name: "Danza Moderna", day: "Miércoles", time: "09:00–10:30" },
    ],
    status: "inactive", joinDate: "2025-01-20",
    notes: "Pausó temporalmente por lesión.",
  },
  {
    id: "s12", name: "Tomás Ruiz", email: "tomas@ejemplo.com", phone: "(011) 5555-2222", birthdate: "1996-10-30",
    enrolledClasses: [
      { id: "7", name: "Tango Intensivo", day: "Sábado", time: "16:00–18:00" },
    ],
    status: "active", joinDate: "2025-11-05",
  },
];
