// TODO: Replace with actual API calls to backend
export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  amount: number;
  method: string;
  status: "paid" | "pending" | "overdue" | "refunded";
  date: string;
}

export async function getPayments(): Promise<Payment[]> {
  return [];
}

export async function recordPayment(data: Omit<Payment, "id">): Promise<Payment> {
  return { id: "mock-id", ...data };
}
