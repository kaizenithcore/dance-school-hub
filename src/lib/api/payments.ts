import { apiRequest, resolveAccessToken } from "./client";

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  payerName: string;
  accountNumber?: string;
  enrollmentId?: string;
  concept: string;
  month: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "refunded";
  method: string;
  date: string;
  notes?: string;
  receiptGenerated?: boolean;
  paidAt?: string;
  dueAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  amountChanged?: boolean;
}

export async function getPayments(): Promise<PaymentRecord[]> {
  const response = await apiRequest<PaymentRecord[]>("/api/admin/payments");
  return response.success && response.data ? response.data : [];
}

export async function recordPayment(data: {
  studentId: string;
  amount: number;
  status?: "paid" | "pending";
  metadata?: Record<string, any>;
}): Promise<PaymentRecord | null> {
  const response = await apiRequest<PaymentRecord>("/api/admin/payments", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response.success && response.data ? response.data : null;
}

export async function updatePaymentStatus(
  paymentId: string,
  status: "pending" | "paid" | "overdue" | "refunded"
): Promise<PaymentRecord | null> {
  const response = await apiRequest<PaymentRecord>(`/api/admin/payments/${paymentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  return response.success && response.data ? response.data : null;
}

export interface DashboardMetrics {
  activeStudents: number;
  totalStudents: number;
  activeClasses: number;
  totalClasses: number;
  monthRevenue: number;
  overduePayments: number;
  pendingEnrollments: number;
  enrollmentRate: number;
  currentMonth: string;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics | null> {
  const response = await apiRequest<DashboardMetrics>("/api/admin/dashboard");
  return response.success && response.data ? response.data : null;
}

export interface AnalyticsData {
  revenueByMonth: Record<string, number>;
  enrollmentsByStatus: Record<string, number>;
  studentsByClass: Record<string, number>;
  methodDistribution: Record<string, number>;
  totalRevenue: number;
  pendingRevenue: number;
}

export async function getAnalyticsData(): Promise<AnalyticsData | null> {
  const response = await apiRequest<AnalyticsData>("/api/admin/analytics");
  return response.success && response.data ? response.data : null;
}

// Invoice types and functions
export interface InvoiceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  month: string;
  status: "pending" | "paid" | "overdue";
  totalAmount: number;
  paymentMethod?: string;
  paidDate?: string;
  invoiceNumber: string;
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  classId: string;
  className: string;
  amount: number;
}

export interface InvoiceDetail extends InvoiceRecord {
  items: InvoiceItem[];
}

export async function getInvoices(month?: string): Promise<InvoiceRecord[]> {
  const url = month ? `/api/admin/invoices?month=${month}` : "/api/admin/invoices";
  const response = await apiRequest<InvoiceRecord[]>(url);
  return response.success && response.data ? response.data : [];
}

export async function generateMonthlyInvoices(month: string): Promise<{
  created: number;
  invoices: InvoiceRecord[];
  message: string;
} | null> {
  const response = await apiRequest<{
    created: number;
    invoices: InvoiceRecord[];
    message: string;
  }>("/api/admin/invoices", {
    method: "POST",
    body: JSON.stringify({ month }),
  });

  return response.success && response.data ? response.data : null;
}

export async function getInvoiceDetail(invoiceId: string): Promise<InvoiceDetail | null> {
  const response = await apiRequest<InvoiceDetail>(`/api/admin/invoices/${invoiceId}`);
  return response.success && response.data ? response.data : null;
}

export async function markInvoiceAsPaid(
  invoiceId: string,
  options: {
    paymentMethod?: string;
    accountNumber?: string;
    payerName?: string;
  } = {}
): Promise<InvoiceRecord | null> {
  const response = await apiRequest<InvoiceRecord>(
    `/api/admin/invoices/${invoiceId}`,
    {
      method: "PATCH",
      body: JSON.stringify(options),
    }
  );

  return response.success && response.data ? response.data : null;
}

export interface ReceiptBatchResult {
  batchId: string;
  month: string;
  generatedCount: number;
  skippedCount: number;
  downloadUrl: string;
}

export async function createCashReceiptBatch(month: string): Promise<ReceiptBatchResult | null> {
  const response = await apiRequest<ReceiptBatchResult>("/api/admin/receipts/batches", {
    method: "POST",
    body: JSON.stringify({ month }),
  });

  return response.success && response.data ? response.data : null;
}

export async function downloadReceiptBatchPdf(batchId: string): Promise<Blob> {
  const token = await resolveAccessToken();
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const response = await fetch(`${apiUrl}/api/admin/receipts/batches/${batchId}/download`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error("No se pudo descargar el PDF de recibos");
  }

  return response.blob();
}

export async function downloadPaymentReceiptPdf(paymentId: string): Promise<Blob> {
  const token = await resolveAccessToken();
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const response = await fetch(`${apiUrl}/api/admin/receipts/payments/${paymentId}/download`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error("No se pudo descargar el recibo del pago");
  }

  return response.blob();
}
