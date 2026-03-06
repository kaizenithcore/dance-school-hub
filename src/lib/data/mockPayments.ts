export type PaymentStatus = "paid" | "pending" | "overdue" | "refunded";
export type PaymentMethod = "Transferencia bancaria" | "Mercado Pago" | "Efectivo" | "Tarjeta de crédito/débito";

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  concept: string;
  month: string; // e.g. "2026-03"
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  notes?: string;
}

export const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: "p1", studentId: "s1", studentName: "María Santos", studentEmail: "maria@ejemplo.com",
    concept: "Mensualidad — Ballet Principiantes + Danza Contemporánea",
    month: "2026-03", amount: 175, method: "Transferencia bancaria", status: "paid", date: "2026-03-02",
  },
  {
    id: "p2", studentId: "s2", studentName: "João Silva", studentEmail: "joao@ejemplo.com",
    concept: "Mensualidad — Ballet Avanzado",
    month: "2026-03", amount: 95, method: "Mercado Pago", status: "paid", date: "2026-03-01",
  },
  {
    id: "p3", studentId: "s3", studentName: "Ana Oliveira", studentEmail: "ana@ejemplo.com",
    concept: "Mensualidad — Hip Hop Niños",
    month: "2026-03", amount: 65, method: "Efectivo", status: "pending", date: "2026-03-05",
  },
  {
    id: "p4", studentId: "s4", studentName: "Carlos Méndez", studentEmail: "carlos@ejemplo.com",
    concept: "Mensualidad — Salsa y Bachata + Tango Intensivo",
    month: "2026-03", amount: 200, method: "Tarjeta de crédito/débito", status: "paid", date: "2026-03-03",
  },
  {
    id: "p5", studentId: "s7", studentName: "Valentina Torres", studentEmail: "vale@ejemplo.com",
    concept: "Mensualidad — Ballet Principiantes + Salsa y Bachata + Folklore",
    month: "2026-03", amount: 240, method: "Mercado Pago", status: "pending", date: "2026-03-06",
  },
  {
    id: "p6", studentId: "s6", studentName: "Diego Ramírez", studentEmail: "diego@ejemplo.com",
    concept: "Mensualidad — Jazz Fusión",
    month: "2026-03", amount: 90, method: "Transferencia bancaria", status: "overdue", date: "2026-02-28",
  },
  {
    id: "p7", studentId: "s10", studentName: "Nicolás Acosta", studentEmail: "nico@ejemplo.com",
    concept: "Mensualidad — Ballet Avanzado + Danza Contemporánea",
    month: "2026-03", amount: 185, method: "Mercado Pago", status: "paid", date: "2026-03-01",
  },
  {
    id: "p8", studentId: "s9", studentName: "Sofía Herrera", studentEmail: "sofia@ejemplo.com",
    concept: "Mensualidad — Hip Hop Niños",
    month: "2026-03", amount: 65, method: "Efectivo", status: "pending", date: "2026-03-04",
  },
  {
    id: "p9", studentId: "s1", studentName: "María Santos", studentEmail: "maria@ejemplo.com",
    concept: "Mensualidad — Ballet Principiantes + Danza Contemporánea",
    month: "2026-02", amount: 175, method: "Transferencia bancaria", status: "paid", date: "2026-02-03",
  },
  {
    id: "p10", studentId: "s4", studentName: "Carlos Méndez", studentEmail: "carlos@ejemplo.com",
    concept: "Mensualidad — Salsa y Bachata + Tango Intensivo",
    month: "2026-02", amount: 200, method: "Tarjeta de crédito/débito", status: "paid", date: "2026-02-02",
  },
  {
    id: "p11", studentId: "s12", studentName: "Tomás Ruiz", studentEmail: "tomas@ejemplo.com",
    concept: "Clase suelta — Tango Intensivo",
    month: "2026-03", amount: 120, method: "Efectivo", status: "paid", date: "2026-03-01",
  },
  {
    id: "p12", studentId: "s6", studentName: "Diego Ramírez", studentEmail: "diego@ejemplo.com",
    concept: "Mensualidad — Jazz Fusión",
    month: "2026-02", amount: 90, method: "Transferencia bancaria", status: "refunded", date: "2026-02-05",
    notes: "Reembolso por clase cancelada.",
  },
];
