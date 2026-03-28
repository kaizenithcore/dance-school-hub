import { chromium } from "playwright";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

type BatchStatus = "processing" | "completed" | "failed";

interface ReceiptBatchRecord {
  id: string;
  tenant_id: string;
  month: string;
  payment_method_filter: string;
  status: BatchStatus;
  generated_count: number;
  failed_count: number;
  template_version: string;
  branding_snapshot: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

interface ReceiptRecord {
  id: string;
  batch_id: string;
  payment_id: string;
  student_id: string | null;
  receipt_number: string;
  issued_at: string;
  amount_cents: number;
  currency: string;
  payload_snapshot: Record<string, unknown>;
}

interface PaymentRow {
  id: string;
  student_id: string;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
  provider: string | null;
  metadata: Record<string, unknown> | null;
  students: { name?: string | null; email?: string | null } | Array<{ name?: string | null; email?: string | null }> | null;
}

interface TenantBranding {
  schoolName: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  footerText?: string;
}

function normalizeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function monthRegex(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}

function asStudent(raw: PaymentRow["students"]) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] || null;
  return raw;
}

function isCashPayment(payment: PaymentRow): boolean {
  const provider = (payment.provider || "").toLowerCase();
  const metadata = payment.metadata || {};
  const explicit = normalizeText(metadata.payment_method, "").toLowerCase();

  const cashValues = new Set(["cash", "efectivo"]);
  const nonCashValues = new Set(["transfer", "transferencia", "card", "mercadopago", "bank_transfer"]);

  if (explicit) {
    if (cashValues.has(explicit)) return true;
    if (nonCashValues.has(explicit)) return false;
  }

  if (cashValues.has(provider)) return true;
  if (provider === "manual") return true;

  return false;
}

function toReceiptNumber(month: string, sequence: number) {
  const monthCompact = month.replace("-", "");
  return `RC-${monthCompact}-${String(sequence).padStart(5, "0")}`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function amountToCurrency(amountCents: number, currency: string) {
  const value = amountCents / 100;
  const normalizedCurrency = (currency || "").toUpperCase();
  const symbol = normalizedCurrency === "EUR" || normalizedCurrency === "ARS" ? "€" : "€";
  return `${symbol}${value.toFixed(2)}`;
}

function formatPaymentMethodLabel(value: string) {
  const normalized = normalizeText(value, "").toLowerCase();
  if (!normalized) return "Efectivo";

  if (normalized === "cash" || normalized === "efectivo" || normalized === "manual") {
    return "Efectivo";
  }
  if (normalized === "transfer" || normalized === "transferencia" || normalized === "bank_transfer") {
    return "Transferencia bancaria";
  }
  if (normalized === "card" || normalized === "tarjeta") {
    return "Tarjeta";
  }
  if (normalized === "mercadopago") {
    return "Mercado Pago";
  }

  return value;
}

function buildHtml(receipts: ReceiptRecord[], branding: TenantBranding, month: string) {
  const primary = normalizeText(branding.primaryColor, "#0f172a");
  const accent = normalizeText(branding.accentColor, "#334155");
  const schoolName = escapeHtml(normalizeText(branding.schoolName, "Escuela de Danza"));
  const footer = escapeHtml(normalizeText(branding.footerText, "Gracias por confiar en nuestra escuela."));
  const logo = normalizeText(branding.logoUrl, "");

  const pages = receipts
    .map((receipt) => {
      const payload = receipt.payload_snapshot || {};
      const studentName = escapeHtml(normalizeText(payload.student_name, "Alumno"));
      const payerName = escapeHtml(normalizeText(payload.payer_name, studentName));
      const concept = escapeHtml(normalizeText(payload.concept, "Pago mensual"));
      const paymentMethod = escapeHtml(formatPaymentMethodLabel(normalizeText(payload.payment_method, "Efectivo")));

      return `
        <section class="receipt-page">
          <header class="receipt-header">
            <div class="brand">
              ${logo ? `<img src="${escapeHtml(logo)}" class="logo" alt="Logo" />` : ""}
              <div>
                <h1>${schoolName}</h1>
                <p>Recibo de pago</p>
              </div>
            </div>
            <div class="meta">
              <p><strong>Nº:</strong> ${escapeHtml(receipt.receipt_number)}</p>
              <p><strong>Fecha:</strong> ${escapeHtml(formatDate(receipt.issued_at))}</p>
              <p><strong>Periodo:</strong> ${escapeHtml(month)}</p>
            </div>
          </header>

          <main class="receipt-body">
            <div class="row"><span>Alumno</span><strong>${studentName}</strong></div>
            <div class="row"><span>Pagador</span><strong>${payerName}</strong></div>
            <div class="row"><span>Método</span><strong>${paymentMethod}</strong></div>
            <div class="row"><span>Concepto</span><strong>${concept}</strong></div>
            <div class="total"><span>Importe</span><strong>${amountToCurrency(receipt.amount_cents, receipt.currency || "EUR")}</strong></div>
          </main>

          <footer class="receipt-footer">
            <p>${footer}</p>
            <small>Documento generado automáticamente por Nexa.</small>
          </footer>
        </section>
      `;
    })
    .join("\n");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; }
          .receipt-page {
            min-height: 260mm;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            break-after: page;
          }
          .receipt-page:last-child { break-after: auto; }
          .receipt-header { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 14px; border-bottom: 2px solid ${accent}; }
          .brand { display: flex; align-items: center; gap: 12px; }
          .logo { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; }
          h1 { margin: 0; font-size: 24px; color: ${primary}; }
          .brand p { margin: 2px 0 0; color: #4b5563; }
          .meta p { margin: 0 0 4px; font-size: 12px; text-align: right; }
          .receipt-body { margin-top: 18px; display: grid; gap: 10px; }
          .row { display: flex; justify-content: space-between; padding: 9px 10px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 14px; }
          .row span { color: #475569; }
          .total { margin-top: 14px; display: flex; justify-content: space-between; padding: 12px 10px; border-top: 2px solid ${accent}; font-size: 19px; color: ${primary}; }
          .receipt-footer { margin-top: auto; padding-top: 18px; color: #6b7280; font-size: 12px; }
          .receipt-footer p { margin: 0 0 8px; }
        </style>
      </head>
      <body>
        ${pages}
      </body>
    </html>
  `;
}

async function resolveBranding(tenantId: string): Promise<TenantBranding> {
  const { data: tenantData } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  const { data: settingsData } = await supabaseAdmin
    .from("school_settings")
    .select("branding")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const branding = (settingsData?.branding && typeof settingsData.branding === "object")
    ? (settingsData.branding as Record<string, unknown>)
    : {};

  return {
    schoolName: normalizeText(tenantData?.name, "Escuela de Danza"),
    logoUrl: normalizeText(branding.logoUrl || branding.logo_url, "") || undefined,
    primaryColor: normalizeText(branding.primaryColor || branding.primary_color, "") || undefined,
    accentColor: normalizeText(branding.accentColor || branding.accent_color, "") || undefined,
    footerText: normalizeText(branding.receiptFooterText || branding.receipt_footer_text, "") || undefined,
  };
}

export const receiptService = {
  async ensureReceiptForPayment(tenantId: string, userId: string, paymentId: string) {
    const { data: existingReceipt, error: existingReceiptError } = await supabaseAdmin
      .from("receipts")
      .select("id, batch_id, payment_id, student_id, receipt_number, issued_at, amount_cents, currency, payload_snapshot")
      .eq("tenant_id", tenantId)
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (existingReceiptError) {
      throw new Error(`Failed to check existing receipt: ${existingReceiptError.message}`);
    }

    if (existingReceipt) {
      return existingReceipt as ReceiptRecord;
    }

    const { data: paymentRow, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, student_id, amount_cents, currency, paid_at, created_at, provider, metadata, students(name, email)")
      .eq("tenant_id", tenantId)
      .eq("id", paymentId)
      .eq("status", "paid")
      .single();

    if (paymentError || !paymentRow) {
      throw new Error("Paid payment not found");
    }

    const payment = paymentRow as PaymentRow;

    const { count: confirmedCount, error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("student_id", payment.student_id)
      .eq("status", "confirmed");

    if (enrollmentError) {
      throw new Error(`Failed to validate enrollment: ${enrollmentError.message}`);
    }

    if ((confirmedCount || 0) === 0) {
      throw new Error("Payment student has no accepted enrollment");
    }

    const paidAt = payment.paid_at || payment.created_at;
    const paidMonth = paidAt.substring(0, 7);
    if (!monthRegex(paidMonth)) {
      throw new Error("Unable to resolve payment month for receipt");
    }

    const branding = await resolveBranding(tenantId);
    const { data: batch, error: batchError } = await supabaseAdmin
      .from("receipt_batches")
      .insert({
        tenant_id: tenantId,
        month: paidMonth,
        payment_method_filter: "single",
        status: "completed",
        generated_count: 1,
        failed_count: 0,
        created_by: userId,
        branding_snapshot: branding,
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      throw new Error(`Failed to create single receipt batch: ${batchError?.message}`);
    }

    const monthPrefix = `RC-${paidMonth.replace("-", "")}-`;
    const { data: existingMonthReceipts, error: existingMonthError } = await supabaseAdmin
      .from("receipts")
      .select("receipt_number")
      .eq("tenant_id", tenantId)
      .like("receipt_number", `${monthPrefix}%`);

    if (existingMonthError) {
      throw new Error(`Failed to calculate receipt sequence: ${existingMonthError.message}`);
    }

    const sequence = (existingMonthReceipts || []).length + 1;
    const student = asStudent(payment.students);
    const metadata = payment.metadata || {};
    const paymentMethod = normalizeText(metadata.payment_method, payment.provider || "cash");

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("receipts")
      .insert({
        tenant_id: tenantId,
        batch_id: batch.id,
        payment_id: payment.id,
        student_id: payment.student_id,
        receipt_number: toReceiptNumber(paidMonth, sequence),
        issued_at: paidAt,
        amount_cents: payment.amount_cents,
        currency: normalizeText(payment.currency, "EUR"),
        status: "generated",
        payload_snapshot: {
          student_name: normalizeText(student?.name, "Alumno"),
          student_email: normalizeText(student?.email, ""),
          payer_name: normalizeText(metadata.payer_name, student?.name || "Alumno"),
          payment_method: paymentMethod,
          concept: normalizeText(metadata.concept, "Pago mensual"),
          month: paidMonth,
        },
      })
      .select("id, batch_id, payment_id, student_id, receipt_number, issued_at, amount_cents, currency, payload_snapshot")
      .single();

    if (insertError || !inserted) {
      throw new Error(`Failed to create receipt: ${insertError?.message}`);
    }

    return inserted as ReceiptRecord;
  },

  async buildPaymentReceiptPdf(tenantId: string, userId: string, paymentId: string): Promise<Buffer> {
    const receipt = await this.ensureReceiptForPayment(tenantId, userId, paymentId);

    const { data: batchData } = await supabaseAdmin
      .from("receipt_batches")
      .select("month, branding_snapshot")
      .eq("tenant_id", tenantId)
      .eq("id", receipt.batch_id)
      .maybeSingle();

    const paidMonth = normalizeText(receipt.issued_at, "").substring(0, 7);
    const month = monthRegex(batchData?.month || "") ? (batchData?.month as string) : paidMonth;
    const brandingSnapshot =
      batchData?.branding_snapshot && typeof batchData.branding_snapshot === "object"
        ? (batchData.branding_snapshot as TenantBranding)
        : await resolveBranding(tenantId);

    const html = buildHtml([receipt], brandingSnapshot, month);

    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    const browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "10mm",
          right: "10mm",
          bottom: "10mm",
          left: "10mm",
        },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  },

  async createCashBatch(tenantId: string, userId: string, month?: string) {
    const selectedMonth = normalizeText(month, getCurrentMonth());
    if (!monthRegex(selectedMonth)) {
      throw new Error("Invalid month format. Expected YYYY-MM");
    }

    const { data: confirmedRows, error: confirmedError } = await supabaseAdmin
      .from("enrollments")
      .select("student_id")
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed");

    if (confirmedError) {
      throw new Error(`Failed to fetch confirmed enrollments: ${confirmedError.message}`);
    }

    const confirmedStudentIds = new Set((confirmedRows || []).map((row: { student_id: string }) => row.student_id));

    const start = `${selectedMonth}-01T00:00:00.000Z`;
    const [year, monthNum] = selectedMonth.split("-").map(Number);
    const endDate = new Date(Date.UTC(year, monthNum, 1));
    const end = endDate.toISOString();

    const { data: paymentRows, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select("id, student_id, amount_cents, currency, paid_at, created_at, provider, metadata, students(name, email)")
      .eq("tenant_id", tenantId)
      .eq("status", "paid")
      .gte("paid_at", start)
      .lt("paid_at", end)
      .order("paid_at", { ascending: true });

    if (paymentsError) {
      throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
    }

    const eligible = (paymentRows as PaymentRow[] || [])
      .filter((payment) => confirmedStudentIds.has(payment.student_id))
      .filter((payment) => isCashPayment(payment));

    const paymentIds = eligible.map((item) => item.id);

    const { data: existingReceiptsRows, error: existingError } = paymentIds.length > 0
      ? await supabaseAdmin
          .from("receipts")
          .select("payment_id")
          .eq("tenant_id", tenantId)
          .in("payment_id", paymentIds)
      : { data: [], error: null };

    if (existingError) {
      throw new Error(`Failed to validate existing receipts: ${existingError.message}`);
    }

    const existingReceiptPaymentIds = new Set((existingReceiptsRows || []).map((row: { payment_id: string }) => row.payment_id));
    const pendingPayments = eligible.filter((payment) => !existingReceiptPaymentIds.has(payment.id));

    const branding = await resolveBranding(tenantId);

    const { data: batch, error: batchError } = await supabaseAdmin
      .from("receipt_batches")
      .insert({
        tenant_id: tenantId,
        month: selectedMonth,
        payment_method_filter: "cash",
        status: "processing",
        generated_count: 0,
        failed_count: 0,
        created_by: userId,
        branding_snapshot: branding,
      })
      .select("id, tenant_id, month, payment_method_filter, status, generated_count, failed_count, template_version, branding_snapshot, created_by, created_at")
      .single();

    if (batchError || !batch) {
      throw new Error(`Failed to create receipt batch: ${batchError?.message}`);
    }

    if (pendingPayments.length === 0) {
      await supabaseAdmin
        .from("receipt_batches")
        .update({ status: "completed", generated_count: 0, failed_count: 0 })
        .eq("id", batch.id)
        .eq("tenant_id", tenantId);

      return {
        batchId: batch.id,
        month: selectedMonth,
        generatedCount: 0,
        skippedCount: eligible.length,
      };
    }

    const monthPrefix = `RC-${selectedMonth.replace("-", "")}-`;
    const { data: existingMonthReceipts, error: existingMonthError } = await supabaseAdmin
      .from("receipts")
      .select("receipt_number")
      .eq("tenant_id", tenantId)
      .like("receipt_number", `${monthPrefix}%`);

    if (existingMonthError) {
      throw new Error(`Failed to calculate receipt sequence: ${existingMonthError.message}`);
    }

    let sequence = (existingMonthReceipts || []).length;

    const rows = pendingPayments.map((payment) => {
      sequence += 1;
      const student = asStudent(payment.students);
      const metadata = payment.metadata || {};
      const paymentMethod = normalizeText(metadata.payment_method, payment.provider === "manual" ? "cash" : payment.provider || "cash");

      return {
        tenant_id: tenantId,
        batch_id: batch.id,
        payment_id: payment.id,
        student_id: payment.student_id,
        receipt_number: toReceiptNumber(selectedMonth, sequence),
        issued_at: payment.paid_at || payment.created_at,
        amount_cents: payment.amount_cents,
        currency: normalizeText(payment.currency, "EUR"),
        status: "generated",
        payload_snapshot: {
          student_name: normalizeText(student?.name, "Alumno"),
          student_email: normalizeText(student?.email, ""),
          payer_name: normalizeText(metadata.payer_name, student?.name || "Alumno"),
          payment_method: paymentMethod,
          concept: normalizeText(metadata.invoice_number, "Pago mensual"),
          month: selectedMonth,
        },
      };
    });

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("receipts")
      .insert(rows)
      .select("id, batch_id, payment_id, student_id, receipt_number, issued_at, amount_cents, currency, payload_snapshot");

    if (insertError) {
      await supabaseAdmin
        .from("receipt_batches")
        .update({ status: "failed", generated_count: 0, failed_count: rows.length })
        .eq("id", batch.id)
        .eq("tenant_id", tenantId);
      throw new Error(`Failed to insert receipts: ${insertError.message}`);
    }

    await supabaseAdmin
      .from("receipt_batches")
      .update({ status: "completed", generated_count: insertedRows?.length || 0, failed_count: 0 })
      .eq("id", batch.id)
      .eq("tenant_id", tenantId);

    return {
      batchId: batch.id,
      month: selectedMonth,
      generatedCount: insertedRows?.length || 0,
      skippedCount: eligible.length - (insertedRows?.length || 0),
    };
  },

  async listBatches(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from("receipt_batches")
      .select("id, tenant_id, month, payment_method_filter, status, generated_count, failed_count, template_version, branding_snapshot, created_by, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to fetch receipt batches: ${error.message}`);
    }

    return (data || []) as ReceiptBatchRecord[];
  },

  async buildBatchPdf(tenantId: string, batchId: string): Promise<Buffer> {
    const { data: batch, error: batchError } = await supabaseAdmin
      .from("receipt_batches")
      .select("id, month, branding_snapshot")
      .eq("tenant_id", tenantId)
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      throw new Error("Receipt batch not found");
    }

    const { data: receiptsData, error: receiptsError } = await supabaseAdmin
      .from("receipts")
      .select("id, batch_id, payment_id, student_id, receipt_number, issued_at, amount_cents, currency, payload_snapshot")
      .eq("tenant_id", tenantId)
      .eq("batch_id", batchId)
      .order("issued_at", { ascending: true });

    if (receiptsError) {
      throw new Error(`Failed to fetch receipts: ${receiptsError.message}`);
    }

    const receipts = (receiptsData || []) as ReceiptRecord[];
    if (receipts.length === 0) {
      throw new Error("Batch has no receipts");
    }

    const brandingSnapshot =
      batch.branding_snapshot && typeof batch.branding_snapshot === "object"
        ? (batch.branding_snapshot as TenantBranding)
        : await resolveBranding(tenantId);

    const html = buildHtml(receipts, brandingSnapshot, batch.month);

    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    const browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "10mm",
          right: "10mm",
          bottom: "10mm",
          left: "10mm",
        },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  },
};
