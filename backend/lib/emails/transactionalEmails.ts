import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { emailService } from "@/lib/services/emailService";
import { renderEmailTemplate } from "@/lib/emails/templateRenderer";

const FROM_NOTIFICATIONS = "Nexa <noreply@notifications.kaizenith.es>";

// ─── School context helper ───────────────────────────────────────────────────

interface SchoolContext {
  schoolName: string;
  schoolEmail: string;
  schoolPhone: string;
  adminEmail: string;
}

async function getSchoolContext(tenantId: string): Promise<SchoolContext> {
  const [tenantRes, settingsRes, memberRes] = await Promise.all([
    supabaseAdmin.from("tenants").select("name").eq("id", tenantId).single(),
    supabaseAdmin
      .from("school_settings")
      .select("enrollment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabaseAdmin
      .from("tenant_memberships")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle(),
  ]);

  const schoolName = tenantRes.data?.name ?? "";
  const enrollmentConfig =
    (settingsRes.data?.enrollment_config as Record<string, unknown>) ?? {};
  const publicProfile =
    ((enrollmentConfig.public_profile ?? enrollmentConfig.publicProfile) as Record<string, unknown>) ?? {};
  const schoolEmail =
    typeof publicProfile.email === "string" ? publicProfile.email : "";
  const schoolPhone =
    typeof publicProfile.phone === "string" ? publicProfile.phone : "";

  // Owner email via auth.users (admin client has access)
  let adminEmail = schoolEmail;
  if (memberRes.data?.user_id) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
      memberRes.data.user_id
    );
    if (authUser?.user?.email) {
      adminEmail = authUser.user.email;
    }
  }

  return { schoolName, schoolEmail, schoolPhone, adminEmail };
}

// ─── Classes list HTML ───────────────────────────────────────────────────────

interface ClassRow {
  id: string;
  name: string;
  class_schedules:
    | Array<{ weekday: string | null; start_time: string | null; end_time: string | null }>
    | null;
}

const WEEKDAYS: Record<string, string> = {
  "0": "Domingo",
  "1": "Lunes",
  "2": "Martes",
  "3": "Miércoles",
  "4": "Jueves",
  "5": "Viernes",
  "6": "Sábado",
};

function buildClassesListHtml(classes: ClassRow[]): string {
  return classes
    .map((cls) => {
      const schedule = Array.isArray(cls.class_schedules) && cls.class_schedules[0];
      const day = schedule ? (WEEKDAYS[String(schedule.weekday)] ?? schedule.weekday ?? "") : "";
      const time =
        schedule && schedule.start_time
          ? `${String(schedule.start_time).slice(0, 5)}${schedule.end_time ? `–${String(schedule.end_time).slice(0, 5)}` : ""}`
          : "";
      const scheduleText = [day, time].filter(Boolean).join(" · ");

      return `<table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#faf9ff;border-radius:10px;overflow:hidden;margin-bottom:8px"><tbody><tr><td width="4" style="background:linear-gradient(180deg,#6d3ec4,#a78bfa);font-size:0;line-height:0">&nbsp;</td><td style="padding:12px 14px"><p style="margin:0;font-size:13px;font-weight:600;color:#1a1535">${cls.name}</p>${scheduleText ? `<p style="margin:3px 0 0;font-size:12px;color:#9d8ec8">${scheduleText}</p>` : ""}</td></tr></tbody></table>`;
    })
    .join("");
}

async function fetchClasses(tenantId: string, classIds: string[]): Promise<ClassRow[]> {
  if (classIds.length === 0) return [];
  const { data } = await supabaseAdmin
    .from("classes")
    .select("id, name, class_schedules(weekday, start_time, end_time)")
    .eq("tenant_id", tenantId)
    .in("id", classIds);
  return (data ?? []) as ClassRow[];
}

// ─── Enrollment confirmation (student) ──────────────────────────────────────

export async function sendEnrollmentConfirmation(params: {
  tenantId: string;
  studentName: string;
  studentEmail: string;
  classIds: string[];
}): Promise<void> {
  const { tenantId, studentName, studentEmail, classIds } = params;
  if (!studentEmail) return;

  try {
    const [ctx, classes] = await Promise.all([
      getSchoolContext(tenantId),
      fetchClasses(tenantId, classIds),
    ]);

    const classesListHtml = buildClassesListHtml(classes);

    const html = renderEmailTemplate("enrollment-confirmation", {
      student_name: studentName,
      school_name: ctx.schoolName,
      classes_list: classesListHtml,
      school_email: ctx.schoolEmail,
      school_phone: ctx.schoolPhone,
    });

    await emailService.send({
      to: studentEmail,
      subject: `Solicitud recibida — ${ctx.schoolName}`,
      html,
    });
  } catch (err) {
    console.error("[transactionalEmails] sendEnrollmentConfirmation error:", err);
  }
}

// ─── Admin notification: new enrollment ─────────────────────────────────────

export async function sendAdminNewEnrollment(params: {
  tenantId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  classIds: string[];
  enrollmentId: string;
  submittedAt: string;
}): Promise<void> {
  const { tenantId, studentName, studentEmail, studentPhone, classIds, enrollmentId, submittedAt } = params;

  try {
    const [ctx, classes] = await Promise.all([
      getSchoolContext(tenantId),
      fetchClasses(tenantId, classIds),
    ]);

    if (!ctx.adminEmail) return;

    const classesListHtml = buildClassesListHtml(classes);
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/enrollments?highlight=${enrollmentId}`;

    const html = renderEmailTemplate("admin-new-enrollment", {
      admin_name: ctx.schoolName,
      school_name: ctx.schoolName,
      student_name: studentName,
      student_email: studentEmail,
      student_phone: studentPhone,
      classes_list: classesListHtml,
      submitted_at: submittedAt,
      review_url: reviewUrl,
    });

    await emailService.send({
      to: ctx.adminEmail,
      subject: `Nueva inscripción de ${studentName} — ${ctx.schoolName}`,
      html,
    });
  } catch (err) {
    console.error("[transactionalEmails] sendAdminNewEnrollment error:", err);
  }
}

// ─── Enrollment result (accepted / declined) ─────────────────────────────────

export async function sendEnrollmentResult(params: {
  tenantId: string;
  enrollmentId: string;
  accepted: boolean;
}): Promise<boolean> {
  const { tenantId, enrollmentId, accepted } = params;

  try {
    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select(
        "student_id, class_id, students(name, email), classes(id, name, class_schedules(weekday, start_time, end_time))"
      )
      .eq("tenant_id", tenantId)
      .eq("id", enrollmentId)
      .single();

    if (!enrollment) return false;

    const student = Array.isArray(enrollment.students)
      ? enrollment.students[0]
      : enrollment.students;
    const cls = Array.isArray(enrollment.classes)
      ? enrollment.classes[0]
      : enrollment.classes;

    const studentEmail = (student as { email?: string } | null)?.email ?? "";
    const studentName = (student as { name?: string } | null)?.name ?? "";
    if (!studentEmail) return false;

    const ctx = await getSchoolContext(tenantId);
    const classesListHtml = cls
      ? buildClassesListHtml([cls as ClassRow])
      : "";

    const html = renderEmailTemplate("enrollment-result", {
      student_name: studentName,
      school_name: ctx.schoolName,
      enrollment_accepted: accepted ? "true" : "",
      classes_list: classesListHtml,
      school_email: ctx.schoolEmail,
      school_phone: ctx.schoolPhone,
    });

    const subject = accepted
      ? `Plaza confirmada en ${ctx.schoolName}`
      : `Sobre tu solicitud en ${ctx.schoolName}`;

    await emailService.send({ to: studentEmail, subject, html });
    return true;
  } catch (err) {
    console.error("[transactionalEmails] sendEnrollmentResult error:", err);
    return false;
  }
}

// ─── Payment confirmation ────────────────────────────────────────────────────

export async function sendPaymentConfirmation(params: {
  tenantId: string;
  paymentId: string;
}): Promise<boolean> {
  const { tenantId, paymentId } = params;

  try {
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select(
        "amount_cents, currency, paid_at, provider, metadata, students(name, email), enrollments(classes(name))"
      )
      .eq("tenant_id", tenantId)
      .eq("id", paymentId)
      .single();

    if (!payment) return;

    const student = Array.isArray(payment.students)
      ? payment.students[0]
      : payment.students;
    const enrollment = Array.isArray(payment.enrollments)
      ? payment.enrollments[0]
      : payment.enrollments;
    const cls = Array.isArray(enrollment?.classes)
      ? enrollment.classes[0]
      : enrollment?.classes;

    const studentEmail = (student as { email?: string } | null)?.email ?? "";
    const studentName = (student as { name?: string } | null)?.name ?? "";
    if (!studentEmail) return false;

    const ctx = await getSchoolContext(tenantId);
    const metadata = (payment.metadata as Record<string, unknown>) ?? {};

    const amountEuros = ((payment.amount_cents ?? 0) / 100).toFixed(2);
    const paymentAmount = `${amountEuros} €`;
    const paymentDate = payment.paid_at
      ? new Date(payment.paid_at).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

    const method =
      payment.provider === "transfer" ||
      payment.provider === "bank_transfer" ||
      payment.provider === "transferencia"
        ? "Transferencia bancaria"
        : "Efectivo";

    const concept =
      typeof metadata.invoice_number === "string"
        ? `Factura ${metadata.invoice_number}`
        : (cls as { name?: string } | null)?.name
          ? `Mensualidad — ${(cls as { name: string }).name}`
          : "Pago";

    const reference = typeof metadata.invoice_number === "string" ? metadata.invoice_number : "";

    const html = renderEmailTemplate("payment-confirmation", {
      student_name: studentName,
      school_name: ctx.schoolName,
      payment_amount: paymentAmount,
      payment_date: paymentDate,
      payment_method: method,
      payment_concept: concept,
      payment_reference: reference,
      school_email: ctx.schoolEmail,
    });

    await emailService.send({
      to: studentEmail,
      subject: `Pago confirmado — ${ctx.schoolName}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[transactionalEmails] sendPaymentConfirmation error:", err);
    return false;
  }
}
