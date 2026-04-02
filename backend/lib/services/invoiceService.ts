import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { pricingService } from "@/lib/services/pricingService";
import type { ClassSelection } from "@/lib/types/pricing";

export type InvoiceStatus = "pending" | "paid" | "overdue";

interface Invoice {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  month: string; // "2026-03"
  status: InvoiceStatus;
  totalAmount: number;
  paymentMethod?: string;
  paidDate?: string;
  invoiceNumber: string;
  notes?: string;
  createdAt: string;
}

interface InvoiceItem {
  id: string;
  classId: string;
  className: string;
  amount: number;
}

interface InvoiceDetail extends Invoice {
  items: InvoiceItem[];
}

export const invoiceService = {
  /**
   * Generate monthly invoices for all active students in a given month
   * Groups enrollments by student and creates invoices with line items per class
   */
  async generateMonthlyInvoices(
    tenantId: string,
    month: string // Format: "2026-03"
  ) {
    const buildSelectionFromEnrollment = (enrollment: any): ClassSelection | null => {
      const cls = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes;
      if (!cls) return null;

      const schedules = Array.isArray(cls.class_schedules) ? cls.class_schedules : [];
      const totalClassHours = schedules.reduce((sum: number, schedule: any) => {
        const [startHour = 0, startMinute = 0] = String(schedule.start_time || "").split(":").map((part: string) => Number(part));
        const [endHour = 0, endMinute = 0] = String(schedule.end_time || "").split(":").map((part: string) => Number(part));
        const startTotal = startHour + startMinute / 60;
        const endTotal = endHour + endMinute / 60;
        return sum + Math.max(0, endTotal - startTotal);
      }, 0);

      const selectedScheduleIdsRaw = enrollment?.student_snapshot?.selected_schedule_ids;
      const selectedScheduleIds = Array.isArray(selectedScheduleIdsRaw)
        ? selectedScheduleIdsRaw.filter((value: unknown): value is string => typeof value === "string")
        : [];

      const selectedHours = selectedScheduleIds.length > 0
        ? schedules
            .filter((schedule: any) => selectedScheduleIds.includes(schedule.id))
            .reduce((sum: number, schedule: any) => {
              const [startHour = 0, startMinute = 0] = String(schedule.start_time || "").split(":").map((part: string) => Number(part));
              const [endHour = 0, endMinute = 0] = String(schedule.end_time || "").split(":").map((part: string) => Number(part));
              const startTotal = startHour + startMinute / 60;
              const endTotal = endHour + endMinute / 60;
              return sum + Math.max(0, endTotal - startTotal);
            }, 0)
        : totalClassHours;

      const normalizedTotalHours = totalClassHours > 0 ? totalClassHours : 1;
      const normalizedSelectedHours = selectedHours > 0 ? selectedHours : normalizedTotalHours;
      const ratio = normalizedTotalHours > 0 ? normalizedSelectedHours / normalizedTotalHours : 1;

      return {
        class_id: cls.id,
        discipline_id: cls.discipline_id || "general",
        discipline_name: cls.name || "Clase",
        hours_per_week: normalizedSelectedHours,
        base_price: Math.round(((cls.price_cents || 0) / 100) * ratio * 100) / 100,
      };
    };

    const distributeTotalByBasePrice = (selections: ClassSelection[], totalAmountCents: number) => {
      if (selections.length === 0) {
        return [] as Array<{ class_id: string; amount_cents: number }>;
      }

      const basePricesCents = selections.map((selection) => Math.max(0, Math.round(Number(selection.base_price || 0) * 100)));
      const totalBaseCents = basePricesCents.reduce((sum, value) => sum + value, 0);

      if (totalBaseCents <= 0) {
        const equalShare = Math.floor(totalAmountCents / selections.length);
        let remainder = totalAmountCents - equalShare * selections.length;
        return selections.map((selection) => {
          const amount = equalShare + (remainder > 0 ? 1 : 0);
          remainder = Math.max(0, remainder - 1);
          return { class_id: selection.class_id, amount_cents: amount };
        });
      }

      const rawShares = selections.map((selection, index) => ({
        class_id: selection.class_id,
        base_cents: basePricesCents[index],
        exact_amount: (totalAmountCents * basePricesCents[index]) / totalBaseCents,
      }));

      const floored = rawShares.map((share) => ({
        class_id: share.class_id,
        amount_cents: Math.floor(share.exact_amount),
        fraction: share.exact_amount - Math.floor(share.exact_amount),
      }));

      let distributed = floored.reduce((sum, share) => sum + share.amount_cents, 0);
      let remainder = totalAmountCents - distributed;

      floored.sort((a, b) => b.fraction - a.fraction);
      for (const share of floored) {
        if (remainder <= 0) break;
        share.amount_cents += 1;
        remainder -= 1;
      }

      distributed = floored.reduce((sum, share) => sum + share.amount_cents, 0);
      if (distributed !== totalAmountCents && floored.length > 0) {
        floored[0].amount_cents += totalAmountCents - distributed;
      }

      return floored.map((share) => ({ class_id: share.class_id, amount_cents: share.amount_cents }));
    };

    const isPaymentInMonth = (payment: {
      paid_at?: string | null;
      created_at?: string | null;
      metadata?: Record<string, unknown> | null;
    }) => {
      const metadata = payment.metadata && typeof payment.metadata === "object"
        ? payment.metadata
        : {};

      const metadataMonth = typeof metadata.month === "string" ? metadata.month.substring(0, 7) : null;
      if (metadataMonth === month) {
        return true;
      }

      const paidMonth = typeof payment.paid_at === "string" ? payment.paid_at.substring(0, 7) : null;
      if (paidMonth === month) {
        return true;
      }

      const createdMonth = typeof payment.created_at === "string" ? payment.created_at.substring(0, 7) : null;
      return createdMonth === month;
    };

    // Get all active students with their enrollments
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select(
        `
        id,
        student_id,
        class_id,
        status,
        classes(
          id,
          name,
          discipline_id,
          price_cents,
          created_at,
          class_schedules(id, start_time, end_time)
        ),
        students(
          id,
          name,
          email,
          status
        )
      `
      )
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed");

    if (enrollError) {
      throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);
    }

    // Preload paid payments to avoid generating invoices for students already marked as paid in the month.
    const { data: paidPayments, error: paidPaymentsError } = await supabaseAdmin
      .from("payments")
      .select("student_id, paid_at, created_at, metadata")
      .eq("tenant_id", tenantId)
      .eq("status", "paid");

    if (paidPaymentsError) {
      throw new Error(`Failed to fetch paid payments: ${paidPaymentsError.message}`);
    }

    const paidStudentsForMonth = new Set(
      (paidPayments || [])
        .filter((payment: any) => Boolean(payment.student_id) && isPaymentInMonth(payment))
        .map((payment: any) => String(payment.student_id))
    );

    // Filter by active students (client-side)
    const filteredEnrollments = (enrollments ?? []).filter(
      (enrollment: any) => {
        const student = Array.isArray(enrollment.students) 
          ? enrollment.students[0] 
          : enrollment.students;
        return student?.status === "active";
      }
    );

    // Group enrollments by student
    const studentEnrollments = new Map<
      string,
      {
        student: { id: string; name: string; email: string };
        enrollments: any[];
      }
    >();

    for (const enrollment of filteredEnrollments) {
      const studentId = enrollment.student_id;
      const student = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students;
      if (!studentEnrollments.has(studentId)) {
        studentEnrollments.set(studentId, {
          student,
          enrollments: [],
        });
      }
      studentEnrollments.get(studentId)!.enrollments.push(enrollment);
    }

    // Generate invoices
    const createdInvoices: Invoice[] = [];

    for (const [studentId, { student, enrollments: studentEnrollmentsList }] of studentEnrollments) {
      if (paidStudentsForMonth.has(studentId)) {
        continue;
      }

      // Bill all current confirmed enrollments for the selected month.
      // Do not depend on class creation date, otherwise old classes are never billed.
      const monthEnrollments = studentEnrollmentsList;

      if (monthEnrollments.length === 0) continue;

      const selections = monthEnrollments
        .map((enrollment: any) => buildSelectionFromEnrollment(enrollment))
        .filter((selection: ClassSelection | null): selection is ClassSelection => Boolean(selection));

      const fallbackTotalCents = monthEnrollments.reduce(
        (sum: number, e: any) => sum + (e.classes?.price_cents || 0),
        0
      );

      let totalAmountCents = fallbackTotalCents;
      try {
        if (selections.length > 0) {
          const pricing = await pricingService.calculatePricing(tenantId, selections);
          totalAmountCents = Math.max(0, Math.round(Number(pricing.total || 0) * 100));
        }
      } catch {
        totalAmountCents = fallbackTotalCents;
      }

      // Check if invoice already exists
      const { data: existingInvoice } = await supabaseAdmin
        .from("monthly_invoices")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .eq("month", month)
        .maybeSingle();

      if (existingInvoice) {
        // If a payment already exists for the month, keep invoice synchronized as paid.
        if (paidStudentsForMonth.has(studentId) && existingInvoice.status !== "paid") {
          await supabaseAdmin
            .from("monthly_invoices")
            .update({
              status: "paid",
              paid_date: new Date().toISOString(),
            })
            .eq("tenant_id", tenantId)
            .eq("id", existingInvoice.id);
        }

        continue;
      }

      const monthToken = month.replace("-", "");
      const studentSuffix = studentId.replace(/-/g, "").slice(-6).toUpperCase();

      let invoice: any | null = null;
      let lastInvoiceError: any = null;

      // Retry with a deterministic suffix if a unique invoice_number collision happens.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const invoiceNumber =
          attempt === 0
            ? `INV-${monthToken}-${studentSuffix}`
            : `INV-${monthToken}-${studentSuffix}-${attempt + 1}`;

        const { data: invoiceData, error: invoiceError } = await supabaseAdmin
          .from("monthly_invoices")
          .insert([
            {
              tenant_id: tenantId,
              student_id: studentId,
              month,
              status: "pending",
              total_amount_cents: totalAmountCents,
              invoice_number: invoiceNumber,
            },
          ])
          .select()
          .maybeSingle();

        if (!invoiceError && invoiceData) {
          invoice = invoiceData;
          break;
        }

        lastInvoiceError = invoiceError;
        if (invoiceError?.code !== "23505") {
          break;
        }
      }

      if (!invoice) {
        console.error(`Failed to create invoice for student ${studentId}:`, lastInvoiceError);
        continue;
      }

      // Create invoice items with amounts distributed from the final (discounted) invoice total.
      const distributedItems = distributeTotalByBasePrice(selections, totalAmountCents);
      const items = distributedItems.map((item) => ({
        invoice_id: invoice.id,
        class_id: item.class_id,
        amount_cents: item.amount_cents,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("monthly_invoice_items")
        .insert(items);

      if (itemsError) {
        console.error(`Failed to create invoice items for invoice ${invoice.id}:`, itemsError);
        continue;
      }

      createdInvoices.push({
        id: invoice.id,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        month,
        status: "pending",
        totalAmount: Math.round(totalAmountCents / 100),
        invoiceNumber: invoice.invoice_number,
        createdAt: invoice.created_at,
      });
    }

    return createdInvoices;
  },

  /**
   * List invoices with optional month filter
   */
  async listInvoices(tenantId: string, month?: string) {
    let query = supabaseAdmin
      .from("monthly_invoices")
      .select(
        `
        id,
        student_id,
        month,
        status,
        total_amount_cents,
        payment_method,
        paid_date,
        invoice_number,
        notes,
        created_at,
        students(name, email)
      `
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (month) {
      query = query.eq("month", month);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }

    return (data ?? []).map((invoice: any) => {
      const student = Array.isArray(invoice.students) ? invoice.students[0] : invoice.students;
      return {
        id: invoice.id,
        studentId: invoice.student_id,
        studentName: student?.name || "N/A",
        studentEmail: student?.email || "N/A",
        month: invoice.month,
        status: invoice.status as InvoiceStatus,
        totalAmount: Math.round((invoice.total_amount_cents || 0) / 100),
        paymentMethod: invoice.payment_method,
        paidDate: invoice.paid_date,
        invoiceNumber: invoice.invoice_number,
        notes: invoice.notes,
        createdAt: invoice.created_at,
      };
    });
  },

  /**
   * Get detailed invoice with line items
   */
  async getInvoiceDetail(tenantId: string, invoiceId: string): Promise<InvoiceDetail> {
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("monthly_invoices")
      .select(
        `
        id,
        student_id,
        month,
        status,
        total_amount_cents,
        payment_method,
        paid_date,
        invoice_number,
        notes,
        created_at,
        students(name, email)
      `
      )
      .eq("tenant_id", tenantId)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Failed to fetch invoice: ${invoiceError?.message}`);
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("monthly_invoice_items")
      .select(
        `
        id,
        class_id,
        amount_cents,
        classes(name)
      `
      )
      .eq("invoice_id", invoiceId);

    if (itemsError) {
      throw new Error(`Failed to fetch invoice items: ${itemsError.message}`);
    }

    const student = Array.isArray(invoice.students) ? invoice.students[0] : invoice.students;
    return {
      id: invoice.id,
      studentId: invoice.student_id,
      studentName: student?.name || "N/A",
      studentEmail: student?.email || "N/A",
      month: invoice.month,
      status: invoice.status as InvoiceStatus,
      totalAmount: Math.round((invoice.total_amount_cents || 0) / 100),
      paymentMethod: invoice.payment_method,
      paidDate: invoice.paid_date,
      invoiceNumber: invoice.invoice_number,
      notes: invoice.notes,
      createdAt: invoice.created_at,
      items: (items ?? []).map((item: any) => ({
        id: item.id,
        classId: item.class_id,
        className: item.classes?.name || "N/A",
        amount: Math.round((item.amount_cents || 0) / 100),
      })),
    };
  },

  /**
   * Mark invoice as paid and create a payment record
   */
  async markInvoiceAsPaid(
    tenantId: string,
    invoiceId: string,
    options: {
      paymentMethod?: string;
      accountNumber?: string;
      payerName?: string;
    } = {}
  ) {
    const now = new Date().toISOString();
    const paymentMethod = options.paymentMethod || "manual";
    const provider =
      paymentMethod === "transfer" || paymentMethod === "bank_transfer" || paymentMethod === "transferencia"
        ? "transfer"
        : paymentMethod === "card"
          ? "card"
          : paymentMethod === "mercadopago"
            ? "mercadopago"
            : "cash";

    // Update invoice status
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("monthly_invoices")
      .update({
        status: "paid",
        payment_method: paymentMethod,
        paid_date: now,
      })
      .eq("tenant_id", tenantId)
      .eq("id", invoiceId)
      .select()
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Failed to update invoice: ${invoiceError?.message}`);
    }

    // Get invoice details for payment record creation
    const detail = await this.getInvoiceDetail(tenantId, invoiceId);

    // Build payment metadata
    const paymentMetadata: Record<string, any> = {
      invoice_id: invoiceId,
      month: invoice.month,
      invoice_number: invoice.invoice_number,
    };

    if (options.accountNumber) {
      paymentMetadata.account_number = options.accountNumber;
    }

    if (options.payerName && options.payerName !== detail.studentName) {
      paymentMetadata.payer_name = options.payerName;
    }

    // Check previous month payment to detect amount changes
    const prevMonth = getPreviousMonth(invoice.month);
    const { data: prevPayments } = await supabaseAdmin
      .from("payments")
      .select("amount_cents, metadata")
      .eq("tenant_id", tenantId)
      .eq("student_id", invoice.student_id)
      .like("metadata->>month", prevMonth + "%")
      .limit(1);

    if (prevPayments && prevPayments.length > 0) {
      const prevAmount = prevPayments[0].amount_cents;
      if (Math.abs(prevAmount - invoice.total_amount_cents) > 10) {
        paymentMetadata.amount_changed = true;
      }
    }

    // Keep idempotency and avoid duplicate payment rows.
    // 1) If a payment is already linked to this invoice, update it.
    const { data: linkedPayment } = await supabaseAdmin
      .from("payments")
      .select("id, metadata")
      .eq("tenant_id", tenantId)
      .eq("student_id", invoice.student_id)
      .eq("metadata->>invoice_id", invoiceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (linkedPayment?.id) {
      const existingMetadata =
        linkedPayment.metadata && typeof linkedPayment.metadata === "object"
          ? (linkedPayment.metadata as Record<string, any>)
          : {};

      const { error: updateLinkedError } = await supabaseAdmin
        .from("payments")
        .update({
          amount_cents: invoice.total_amount_cents,
          status: "paid",
          provider,
          paid_at: now,
          metadata: {
            ...existingMetadata,
            ...paymentMetadata,
          },
          updated_at: now,
        })
        .eq("id", linkedPayment.id)
        .eq("tenant_id", tenantId);

      if (updateLinkedError) {
        console.error("Warning: Invoice paid but linked payment update failed:", updateLinkedError);
      }
    } else {
      // 2) Try to reuse an existing payment of the same student/month not yet linked.
      const { data: monthPayments } = await supabaseAdmin
        .from("payments")
        .select("id, metadata")
        .eq("tenant_id", tenantId)
        .eq("student_id", invoice.student_id)
        .like("metadata->>month", `${invoice.month}%`)
        .in("status", ["pending", "overdue", "paid"])
        .order("created_at", { ascending: false })
        .limit(10);

      const monthPayment = (monthPayments || []).find((item: any) => {
        const itemMetadata = item?.metadata && typeof item.metadata === "object"
          ? (item.metadata as Record<string, any>)
          : {};
        return !itemMetadata.invoice_id;
      });

      if (monthPayment?.id) {
        const existingMetadata =
          monthPayment.metadata && typeof monthPayment.metadata === "object"
            ? (monthPayment.metadata as Record<string, any>)
            : {};

        const { error: updateMonthError } = await supabaseAdmin
          .from("payments")
          .update({
            amount_cents: invoice.total_amount_cents,
            status: "paid",
            provider,
            paid_at: now,
            metadata: {
              ...existingMetadata,
              ...paymentMetadata,
            },
            updated_at: now,
          })
          .eq("id", monthPayment.id)
          .eq("tenant_id", tenantId);

        if (updateMonthError) {
          console.error("Warning: Invoice paid but month payment update failed:", updateMonthError);
        }
      } else {
        // 3) Fallback: create payment row.
        const { error: paymentError } = await supabaseAdmin
          .from("payments")
          .insert([
            {
              tenant_id: tenantId,
              student_id: invoice.student_id,
              amount_cents: invoice.total_amount_cents,
              currency: "EUR",
              status: "paid",
              provider,
              paid_at: now,
              metadata: paymentMetadata,
            },
          ]);

        if (paymentError) {
          console.error("Warning: Invoice marked as paid but payment record creation failed:", paymentError);
        }
      }
    }

    // Return invoice data - use the detail that was already fetched which has student data
    return {
      id: detail.id,
      studentId: detail.studentId,
      studentName: detail.studentName,
      studentEmail: detail.studentEmail,
      month: detail.month,
      status: "paid" as InvoiceStatus,
      totalAmount: detail.totalAmount,
      paymentMethod: paymentMethod,
      paidDate: now,
      invoiceNumber: detail.invoiceNumber,
      createdAt: detail.createdAt,
    };
  },

  async deleteInvoice(tenantId: string, invoiceId: string) {
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("monthly_invoices")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Failed to fetch invoice: ${invoiceError?.message}`);
    }

    if (invoice.status === "paid") {
      throw new Error("No se pueden eliminar facturas pagadas");
    }

    const { error: itemsError } = await supabaseAdmin
      .from("monthly_invoice_items")
      .delete()
      .eq("invoice_id", invoiceId);

    if (itemsError) {
      throw new Error(`Failed to delete invoice items: ${itemsError.message}`);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("monthly_invoices")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", invoiceId);

    if (deleteError) {
      throw new Error(`Failed to delete invoice: ${deleteError.message}`);
    }

    return { id: invoiceId, deleted: true };
  },
};

function getPreviousMonth(monthString: string): string {
  // monthString format: "2026-03"
  const [year, month] = monthString.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1); // month - 2 because JS months are 0-indexed
  const prevYear = prevDate.getFullYear();
  const prevMonth = String(prevDate.getMonth() + 1).padStart(2, "0");
  return `${prevYear}-${prevMonth}`;
}
