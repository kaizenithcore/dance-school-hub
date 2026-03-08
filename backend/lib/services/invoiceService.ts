import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

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
          price_cents,
          created_at
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
      // Filter enrollments for the given month
      // Using created_at as the class month indicator
      const monthEnrollments = studentEnrollmentsList.filter((e: any) => {
        const classDate = e.classes?.created_at;
        if (!classDate) return false;
        const classMonth = classDate.substring(0, 7); // "2026-03"
        return classMonth === month;
      });

      if (monthEnrollments.length === 0) continue;

      // Calculate total amount
      const totalAmountCents = monthEnrollments.reduce(
        (sum: number, e: any) => sum + (e.classes?.price_cents || 0),
        0
      );

      // Check if invoice already exists
      const { data: existingInvoice } = await supabaseAdmin
        .from("monthly_invoices")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .eq("month", month)
        .maybeSingle();

      if (existingInvoice) continue; // Skip if already exists

      // Generate a stable, unique-ish invoice number per student/month.
      const studentSuffix = studentId.replace(/-/g, "").slice(0, 6).toUpperCase();
      const invoiceNumber = `INV-${month.replace("-", "")}-${studentSuffix}`;

      // Create invoice
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
        .select();

      if (invoiceError || !invoiceData || invoiceData.length === 0) {
        console.error(`Failed to create invoice for student ${studentId}:`, invoiceError);
        continue;
      }

      const invoice = invoiceData[0];

      // Create invoice items
      const items = monthEnrollments.map((e: any) => ({
        invoice_id: invoice.id,
        class_id: e.class_id,
        amount_cents: e.classes?.price_cents || 0,
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

    // Create associated payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert([
        {
          tenant_id: tenantId,
          student_id: invoice.student_id,
          amount_cents: invoice.total_amount_cents,
          currency: "EUR",
          status: "paid",
          provider: paymentMethod,
          paid_at: now,
          metadata: paymentMetadata,
        },
      ])
      .select()
      .single();

    if (paymentError) {
      console.error("Warning: Invoice marked as paid but payment record creation failed:", paymentError);
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
};

function getPreviousMonth(monthString: string): string {
  // monthString format: "2026-03"
  const [year, month] = monthString.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1); // month - 2 because JS months are 0-indexed
  const prevYear = prevDate.getFullYear();
  const prevMonth = String(prevDate.getMonth() + 1).padStart(2, "0");
  return `${prevYear}-${prevMonth}`;
}
