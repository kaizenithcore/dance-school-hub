import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export type PaymentStatus = "pending" | "paid" | "overdue" | "refunded";

interface AnalyticsStudentRow {
  student_id: string | null;
  amount_cents: number | null;
  status: PaymentStatus;
  paid_at: string | null;
  due_at: string | null;
  students: { name: string | null; email: string | null } | Array<{ name: string | null; email: string | null }> | null;
}

interface PaymentRecord {
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
  status: PaymentStatus;
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

export const paymentService = {
  async listPayments(tenantId: string) {
    const { data: confirmedEnrollmentRows, error: confirmedEnrollmentError } = await supabaseAdmin
      .from("enrollments")
      .select("student_id")
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed");

    if (confirmedEnrollmentError) {
      throw new Error(`Failed to validate enrolled students: ${confirmedEnrollmentError.message}`);
    }

    const confirmedStudentIds = new Set((confirmedEnrollmentRows || []).map((row: any) => row.student_id));

    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(
        `
        id,
        student_id,
        enrollment_id,
        amount_cents,
        currency,
        status,
        provider,
        paid_at,
        due_at,
        metadata,
        created_at,
        students(name, email),
        enrollments(
          id,
          classes(name, price_cents),
          students(name, email)
        )
      `
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }

    const paymentIds = (data ?? []).map((payment: any) => payment.id);
    const { data: receiptRows, error: receiptError } = paymentIds.length > 0
      ? await supabaseAdmin
          .from("receipts")
          .select("payment_id")
          .eq("tenant_id", tenantId)
          .in("payment_id", paymentIds)
      : { data: [], error: null };

    if (receiptError) {
      throw new Error(`Failed to fetch receipt flags: ${receiptError.message}`);
    }

    const receiptByPaymentId = new Set((receiptRows || []).map((row: { payment_id: string }) => row.payment_id));

    return (data ?? [])
      .filter((payment: any) => confirmedStudentIds.has(payment.student_id))
      .map((payment: any) => {
      const student = payment.students;
      const enrollment = Array.isArray(payment.enrollments) ? payment.enrollments[0] : payment.enrollments;
      const cls = enrollment?.classes;
      const metadata = payment.metadata ?? {};
      const month =
        typeof metadata.month === "string" && metadata.month.length >= 7
          ? metadata.month.substring(0, 7)
          : (payment.paid_at || payment.created_at || "").substring(0, 7);
      const method =
        payment.provider === "transfer" ||
        payment.provider === "bank_transfer" ||
        payment.provider === "transferencia"
          ? "Transferencia bancaria"
          : "Efectivo";

      const payerName = typeof metadata.payer_name === "string" ? metadata.payer_name : student?.name || "N/A";
      const accountNumber = typeof metadata.account_number === "string" ? metadata.account_number : undefined;
      const amountChanged = metadata.amount_changed === true;

      return {
        id: payment.id,
        studentId: payment.student_id,
        studentName: student?.name || "N/A",
        studentEmail: student?.email || "N/A",
        payerName,
        accountNumber,
        enrollmentId: payment.enrollment_id,
        concept:
          typeof metadata.invoice_number === "string"
            ? `Factura ${metadata.invoice_number}`
            : cls?.name
              ? `Mensualidad — ${cls.name}`
              : "Pago",
        month,
        amount: Math.round((payment.amount_cents || 0) / 100),
        currency: payment.currency,
        status: payment.status as PaymentStatus,
        method,
        date: payment.paid_at || payment.created_at,
        notes: typeof metadata.notes === "string" ? metadata.notes : undefined,
        receiptGenerated: receiptByPaymentId.has(payment.id),
        paidAt: payment.paid_at,
        dueAt: payment.due_at,
        metadata,
        createdAt: payment.created_at,
        amountChanged,
      };
    });
  },

  async getDashboardMetrics(tenantId: string) {
    // Get active students count
    const { data: students } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    // Get active classes count
    const { data: classes } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    // Get current month revenue (paid payments)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("amount_cents, status, paid_at")
      .eq("tenant_id", tenantId);

    const monthRevenue = (payments || [])
      .filter((p: any) => p.status === "paid" && p.paid_at?.startsWith(currentMonth))
      .reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);

    const overduePayments = (payments || []).filter(
      (p: any) => p.status === "pending" || p.status === "overdue"
    );

    const pendingEnrollments = (await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")).data || [];

    const allEnrollments = (await supabaseAdmin
      .from("enrollments")
      .select("id, status")
      .eq("tenant_id", tenantId)).data || [];

    const confirmedCount = allEnrollments.filter((e: any) => e.status === "confirmed").length;
    const enrollmentRate = allEnrollments.length > 0 ? Math.round((confirmedCount / allEnrollments.length) * 100) : 0;

    return {
      activeStudents: students?.length || 0,
      totalStudents: students?.length || 0,
      activeClasses: classes?.length || 0,
      totalClasses: classes?.length || 0,
      monthRevenue: Math.round(monthRevenue / 100),
      overduePayments: overduePayments.length,
      pendingEnrollments: pendingEnrollments.length,
      enrollmentRate,
      currentMonth,
    };
  },

  async getAnalyticsData(tenantId: string) {
    // Get all payments for revenue analysis
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("amount_cents, status, paid_at, created_at, provider")
      .eq("tenant_id", tenantId);

    const { data: studentPayments } = await supabaseAdmin
      .from("payments")
      .select("student_id, amount_cents, status, paid_at, due_at, students(name, email)")
      .eq("tenant_id", tenantId);

    const { data: students } = await supabaseAdmin
      .from("students")
      .select("id, status")
      .eq("tenant_id", tenantId);

    // Get enrollments by status
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("id, status")
      .eq("tenant_id", tenantId);

    // Get students per class
    const { data: classEnrollments } = await supabaseAdmin
      .from("enrollments")
      .select(`
        id,
        status,
        classes(id, name)
      `)
      .eq("tenant_id", tenantId);

    // Revenue by month
    const revenueByMonth: Record<string, number> = {};
    const paidPayments = (payments || []).filter((p: any) => p.status === "paid");
    
    paidPayments.forEach((p: any) => {
      if (p.paid_at) {
        const month = p.paid_at.substring(0, 7);
        revenueByMonth[month] = (revenueByMonth[month] || 0) + (p.amount_cents || 0);
      }
    });

    // Enrollments by status
    const enrollmentsByStatus: Record<string, number> = {};
    (enrollments || []).forEach((e: any) => {
      enrollmentsByStatus[e.status] = (enrollmentsByStatus[e.status] || 0) + 1;
    });

    // Students per class
    const studentsByClass: Record<string, number> = {};
    (classEnrollments || []).forEach((ce: any) => {
      const cls = Array.isArray(ce.classes) ? ce.classes[0] : ce.classes;
      if (cls) {
        studentsByClass[cls.name] = (studentsByClass[cls.name] || 0) + 1;
      }
    });

    // Payment method distribution
    const methodDistribution: Record<string, number> = {};
    (payments || []).forEach((p: any) => {
      const method = p.provider || "manual";
      methodDistribution[method] = (methodDistribution[method] || 0) + 1;
    });

    const totalRevenueCents = paidPayments.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);
    const pendingRevenueCents = (payments || [])
      .filter((p: any) => p.status === "pending" || p.status === "overdue")
      .reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);

    const activeStudentsCount = (students || []).filter((student: any) => student.status === "active").length;
    const paidStudentMap = new Map<string, { studentName: string; totalPaidCents: number; paymentsCount: number; lastPaymentAt: string | null }>();
    const pendingStudentMap = new Map<string, { studentName: string; pendingCents: number; itemsCount: number; latestDueAt: string | null }>();

    (studentPayments || []).forEach((payment: AnalyticsStudentRow) => {
      if (!payment.student_id) {
        return;
      }

      const student = Array.isArray(payment.students) ? payment.students[0] : payment.students;
      const studentName = student?.name || "Alumno sin nombre";
      const amountCents = payment.amount_cents || 0;

      if (payment.status === "paid") {
        const existing = paidStudentMap.get(payment.student_id) || {
          studentName,
          totalPaidCents: 0,
          paymentsCount: 0,
          lastPaymentAt: null,
        };

        existing.totalPaidCents += amountCents;
        existing.paymentsCount += 1;
        existing.lastPaymentAt = [existing.lastPaymentAt, payment.paid_at].filter(Boolean).sort().at(-1) || null;
        paidStudentMap.set(payment.student_id, existing);
      }

      if (payment.status === "pending" || payment.status === "overdue") {
        const existing = pendingStudentMap.get(payment.student_id) || {
          studentName,
          pendingCents: 0,
          itemsCount: 0,
          latestDueAt: null,
        };

        existing.pendingCents += amountCents;
        existing.itemsCount += 1;
        existing.latestDueAt = [existing.latestDueAt, payment.due_at].filter(Boolean).sort().at(-1) || null;
        pendingStudentMap.set(payment.student_id, existing);
      }
    });

    const topPayingStudents = Array.from(paidStudentMap.entries())
      .map(([studentId, value]) => ({
        studentId,
        studentName: value.studentName,
        totalPaid: Math.round(value.totalPaidCents / 100),
        paymentsCount: value.paymentsCount,
        avgPayment: value.paymentsCount > 0 ? Math.round(value.totalPaidCents / value.paymentsCount / 100) : 0,
        lastPaymentAt: value.lastPaymentAt,
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5);

    const highestPendingBalances = Array.from(pendingStudentMap.entries())
      .map(([studentId, value]) => ({
        studentId,
        studentName: value.studentName,
        pendingAmount: Math.round(value.pendingCents / 100),
        itemsCount: value.itemsCount,
        latestDueAt: value.latestDueAt,
      }))
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 5);

    const payingStudentsCount = paidStudentMap.size;
    const paidPaymentsCount = paidPayments.length;
    const totalTrackedRevenueCents = totalRevenueCents + pendingRevenueCents;

    return {
      revenueByMonth,
      enrollmentsByStatus,
      studentsByClass,
      methodDistribution,
      totalRevenue: Math.round(totalRevenueCents / 100),
      pendingRevenue: Math.round(pendingRevenueCents / 100),
      avgRevenuePerActiveStudent: activeStudentsCount > 0 ? Math.round(totalRevenueCents / activeStudentsCount / 100) : 0,
      avgRevenuePerPayingStudent: payingStudentsCount > 0 ? Math.round(totalRevenueCents / payingStudentsCount / 100) : 0,
      avgPaymentAmount: paidPaymentsCount > 0 ? Math.round(totalRevenueCents / paidPaymentsCount / 100) : 0,
      collectionRatePct: totalTrackedRevenueCents > 0 ? Math.round((totalRevenueCents / totalTrackedRevenueCents) * 100) : 0,
      topPayingStudents,
      highestPendingBalances,
    };
  },

  async recordPayment(
    tenantId: string,
    studentId: string,
    amountCents: number,
    status: PaymentStatus = "paid",
    metadata: Record<string, any> = {}
  ) {
    const { count: confirmedCount, error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("student_id", studentId)
      .eq("status", "confirmed");

    if (enrollmentError) {
      throw new Error(`Failed to validate enrollment status: ${enrollmentError.message}`);
    }

    if ((confirmedCount || 0) === 0) {
      throw new Error("Student has no accepted enrollment");
    }

    const rawPaymentMethod =
      typeof metadata.payment_method === "string"
        ? metadata.payment_method
        : typeof metadata.paymentMethod === "string"
          ? metadata.paymentMethod
          : "cash";
    const paymentMethod = rawPaymentMethod.toLowerCase();
    const provider =
      paymentMethod === "transfer" || paymentMethod === "transferencia" || paymentMethod === "bank_transfer"
        ? "transfer"
        : paymentMethod === "card"
          ? "card"
          : paymentMethod === "mercadopago"
            ? "mercadopago"
            : "cash";

    const monthFromMetadata =
      typeof metadata.month === "string" && /^\d{4}-\d{2}$/.test(metadata.month)
        ? metadata.month
        : null;

    let linkedInvoice: { id: string; invoice_number: string; status: string } | null = null;

    if (monthFromMetadata) {
      const { data: invoiceData } = await supabaseAdmin
        .from("monthly_invoices")
        .select("id, invoice_number, status")
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .eq("month", monthFromMetadata)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      linkedInvoice = invoiceData ?? null;
    }

    const paymentMetadata: Record<string, any> = {
      ...metadata,
    };

    if (linkedInvoice?.id) {
      paymentMetadata.invoice_id = linkedInvoice.id;
      paymentMetadata.invoice_number = linkedInvoice.invoice_number;
    }

    // Idempotency for invoice-linked payments: reuse the existing payment row.
    if (linkedInvoice?.id) {
      const { data: existingInvoicePayment } = await supabaseAdmin
        .from("payments")
        .select("id, metadata")
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .eq("metadata->>invoice_id", linkedInvoice.id)
        .in("status", ["pending", "overdue", "paid"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingInvoicePayment?.id) {
        const existingMetadata =
          existingInvoicePayment.metadata && typeof existingInvoicePayment.metadata === "object"
            ? (existingInvoicePayment.metadata as Record<string, any>)
            : {};

        const now = new Date().toISOString();
        const { data: updatedPayment, error: updateError } = await supabaseAdmin
          .from("payments")
          .update({
            amount_cents: amountCents,
            status,
            provider,
            paid_at: status === "paid" ? now : null,
            metadata: {
              ...existingMetadata,
              ...paymentMetadata,
            },
            updated_at: now,
          })
          .eq("id", existingInvoicePayment.id)
          .eq("tenant_id", tenantId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to record payment: ${updateError.message}`);
        }

        if (status === "paid" && linkedInvoice.status !== "paid") {
          await supabaseAdmin
            .from("monthly_invoices")
            .update({
              status: "paid",
              payment_method: rawPaymentMethod,
              paid_date: now,
            })
            .eq("id", linkedInvoice.id)
            .eq("tenant_id", tenantId);
        }

        return updatedPayment;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("payments")
      .insert({
        tenant_id: tenantId,
        student_id: studentId,
        amount_cents: amountCents,
        currency: "EUR",
        status,
        provider,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        metadata: paymentMetadata,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record payment: ${error.message}`);
    }

    if (status === "paid" && linkedInvoice?.id && linkedInvoice.status !== "paid") {
      await supabaseAdmin
        .from("monthly_invoices")
        .update({
          status: "paid",
          payment_method: rawPaymentMethod,
          paid_date: new Date().toISOString(),
        })
        .eq("id", linkedInvoice.id)
        .eq("tenant_id", tenantId);
    }

    return data;
  },

  async updatePaymentStatus(
    tenantId: string,
    paymentId: string,
    status: PaymentStatus
  ) {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .update({
        status,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update payment: ${error.message}`);
    }

    return data;
  },
};
