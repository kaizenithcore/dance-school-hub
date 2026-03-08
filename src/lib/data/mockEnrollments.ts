export type EnrollmentStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface EnrollmentRecord {
  id: string;
  studentId?: string;
  classId?: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  classes: { id: string; name: string; day: string; time: string; price: number }[];
  status: EnrollmentStatus;
  totalPrice: number;
  paymentMethod: string;
  date: string;
  attachments?: string[];
  notes?: string;
}

export const MOCK_ENROLLMENTS: EnrollmentRecord[] = [
  {
    id: "e1", studentName: "María Santos", studentEmail: "maria@ejemplo.com", studentPhone: "(011) 5555-1234",
    classes: [
      { id: "1", name: "Ballet Principiantes", day: "Lunes", time: "09:00–10:30", price: 85 },
      { id: "2", name: "Danza Contemporánea", day: "Lunes", time: "11:00–12:30", price: 90 },
    ],
    status: "confirmed", totalPrice: 175, paymentMethod: "Transferencia bancaria", date: "2025-08-10",
  },
  {
    id: "e2", studentName: "João Silva", studentEmail: "joao@ejemplo.com", studentPhone: "(011) 5555-2345",
    classes: [
      { id: "5", name: "Ballet Avanzado", day: "Jueves", time: "10:00–11:30", price: 95 },
    ],
    status: "confirmed", totalPrice: 95, paymentMethod: "Mercado Pago", date: "2025-06-01",
  },
  {
    id: "e3", studentName: "Roberto García", studentEmail: "roberto@ejemplo.com", studentPhone: "(011) 5555-3333",
    classes: [
      { id: "6", name: "Salsa y Bachata", day: "Viernes", time: "19:00–20:30", price: 80 },
    ],
    status: "pending", totalPrice: 80, paymentMethod: "Efectivo", date: "2026-03-01",
    notes: "Preguntó si puede probar una clase gratis antes de confirmar.",
  },
  {
    id: "e4", studentName: "Laura Díaz", studentEmail: "laura@ejemplo.com", studentPhone: "(011) 5555-4444",
    classes: [
      { id: "8", name: "Danza Moderna", day: "Miércoles", time: "09:00–10:30", price: 90 },
      { id: "9", name: "Stretching & Barre", day: "Viernes", time: "08:00–09:00", price: 50 },
    ],
    status: "pending", totalPrice: 140, paymentMethod: "Tarjeta de crédito/débito", date: "2026-03-02",
  },
  {
    id: "e5", studentName: "Miguel Ángel Soto", studentEmail: "miguel@ejemplo.com", studentPhone: "(011) 5555-5555",
    classes: [
      { id: "7", name: "Tango Intensivo", day: "Sábado", time: "16:00–18:00", price: 120 },
    ],
    status: "declined", totalPrice: 120, paymentMethod: "Transferencia bancaria", date: "2026-02-20",
    notes: "Rechazado: no cumple con el nivel mínimo requerido.",
  },
  {
    id: "e6", studentName: "Fernanda Ruiz", studentEmail: "fernanda@ejemplo.com", studentPhone: "(011) 5555-6666",
    classes: [
      { id: "3", name: "Hip Hop Niños", day: "Martes", time: "15:00–16:00", price: 65 },
    ],
    status: "cancelled", totalPrice: 65, paymentMethod: "Efectivo", date: "2026-02-15",
    notes: "Cancelado por el estudiante.",
  },
  {
    id: "e7", studentName: "Andrés Martínez", studentEmail: "andres@ejemplo.com", studentPhone: "(011) 5555-7777",
    classes: [
      { id: "1", name: "Ballet Principiantes", day: "Lunes", time: "09:00–10:30", price: 85 },
      { id: "10", name: "Folklore", day: "Sábado", time: "10:00–11:30", price: 75 },
      { id: "6", name: "Salsa y Bachata", day: "Viernes", time: "19:00–20:30", price: 80 },
    ],
    status: "pending", totalPrice: 240, paymentMethod: "Mercado Pago", date: "2026-03-04",
  },
  {
    id: "e8", studentName: "Isabela Mora", studentEmail: "isabela@ejemplo.com", studentPhone: "(011) 5555-8888",
    classes: [
      { id: "4", name: "Jazz Fusión", day: "Miércoles", time: "18:00–19:30", price: 90 },
    ],
    status: "confirmed", totalPrice: 90, paymentMethod: "Tarjeta de crédito/débito", date: "2025-12-10",
  },
  {
    id: "e9", studentName: "Pablo Núñez", studentEmail: "pablo@ejemplo.com", studentPhone: "(011) 5555-9999",
    classes: [
      { id: "2", name: "Danza Contemporánea", day: "Lunes", time: "11:00–12:30", price: 90 },
    ],
    status: "pending", totalPrice: 90, paymentMethod: "Transferencia bancaria", date: "2026-03-05",
    attachments: ["DNI_pablo.pdf", "cert_medico.pdf"],
  },
];
