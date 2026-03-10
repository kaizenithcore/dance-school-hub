export type PaymentStatus = "paid" | "pending" | "overdue" | "refunded";
export type PaymentMethod = "Transferencia bancaria" | "Efectivo";

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  payerName: string;
  concept: string;
  month: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  date: string;
  notes?: string;
  receiptGenerated?: boolean;
  accountNumber?: string;
  amountChanged?: boolean;
  currency?: string;
  createdAt?: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = ["Transferencia bancaria", "Efectivo"];

export const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: "p1", studentId: "s1", studentName: "María Santos", studentEmail: "maria@ejemplo.com", payerName: "María Santos",
    concept: "Mensualidad — Ballet Principiantes + Danza Contemporánea",
    month: "2026-03", amount: 175, method: "Transferencia bancaria", status: "paid", date: "2026-03-02", receiptGenerated: true,
  },
  {
    id: "p2", studentId: "s2", studentName: "João Silva", studentEmail: "joao@ejemplo.com", payerName: "João Silva",
    concept: "Mensualidad — Ballet Avanzado",
    month: "2026-03", amount: 95, method: "Transferencia bancaria", status: "paid", date: "2026-03-01",
  },
  {
    id: "p3", studentId: "s3", studentName: "Ana Oliveira", studentEmail: "ana@ejemplo.com", payerName: "Laura Oliveira",
    concept: "Mensualidad — Hip Hop Niños",
    month: "2026-03", amount: 65, method: "Efectivo", status: "pending", date: "2026-03-05",
  },
  {
    id: "p4", studentId: "s4", studentName: "Carlos Méndez", studentEmail: "carlos@ejemplo.com", payerName: "Carlos Méndez",
    concept: "Mensualidad — Salsa y Bachata + Tango Intensivo",
    month: "2026-03", amount: 200, method: "Transferencia bancaria", status: "paid", date: "2026-03-03", receiptGenerated: true,
  },
  {
    id: "p5", studentId: "s7", studentName: "Valentina Torres", studentEmail: "vale@ejemplo.com", payerName: "Valentina Torres",
    concept: "Mensualidad — Ballet Principiantes + Salsa y Bachata + Folklore",
    month: "2026-03", amount: 240, method: "Transferencia bancaria", status: "pending", date: "2026-03-06",
  },
  {
    id: "p6", studentId: "s6", studentName: "Diego Ramírez", studentEmail: "diego@ejemplo.com", payerName: "Diego Ramírez",
    concept: "Mensualidad — Jazz Fusión",
    month: "2026-03", amount: 90, method: "Transferencia bancaria", status: "overdue", date: "2026-02-28",
  },
  {
    id: "p7", studentId: "s10", studentName: "Nicolás Acosta", studentEmail: "nico@ejemplo.com", payerName: "Nicolás Acosta",
    concept: "Mensualidad — Ballet Avanzado + Danza Contemporánea",
    month: "2026-03", amount: 185, method: "Efectivo", status: "paid", date: "2026-03-01",
  },
  {
    id: "p8", studentId: "s9", studentName: "Sofía Herrera", studentEmail: "sofia@ejemplo.com", payerName: "Pedro Herrera",
    concept: "Mensualidad — Hip Hop Niños",
    month: "2026-03", amount: 65, method: "Efectivo", status: "pending", date: "2026-03-04",
  },
  {
    id: "p9", studentId: "s1", studentName: "María Santos", studentEmail: "maria@ejemplo.com", payerName: "María Santos",
    concept: "Mensualidad — Ballet Principiantes + Danza Contemporánea",
    month: "2026-02", amount: 175, method: "Transferencia bancaria", status: "paid", date: "2026-02-03", receiptGenerated: true,
  },
  {
    id: "p10", studentId: "s4", studentName: "Carlos Méndez", studentEmail: "carlos@ejemplo.com", payerName: "Carlos Méndez",
    concept: "Mensualidad — Salsa y Bachata + Tango Intensivo",
    month: "2026-02", amount: 200, method: "Efectivo", status: "paid", date: "2026-02-02",
  },
  {
    id: "p11", studentId: "s12", studentName: "Tomás Ruiz", studentEmail: "tomas@ejemplo.com", payerName: "Tomás Ruiz",
    concept: "Clase suelta — Tango Intensivo",
    month: "2026-03", amount: 120, method: "Efectivo", status: "paid", date: "2026-03-01",
  },
  {
    id: "p12", studentId: "s6", studentName: "Diego Ramírez", studentEmail: "diego@ejemplo.com", payerName: "Diego Ramírez",
    concept: "Mensualidad — Jazz Fusión",
    month: "2026-02", amount: 90, method: "Transferencia bancaria", status: "refunded", date: "2026-02-05",
    notes: "Reembolso por clase cancelada.",
  },
];
