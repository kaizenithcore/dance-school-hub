import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export type EnrollmentStatus = "pending" | "confirmed" | "declined" | "cancelled";

export const enrollmentService = {
  async listEnrollments(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select(
        `
        id,
        status,
        payment_method,
        notes,
        created_at,
        class_id,
        student_id,
        student_snapshot,
        students(name, email, phone),
        classes(id, name, price_cents, class_schedules(weekday, start_time, end_time)),
        enrollment_attachments(file_name, file_path)
      `
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch enrollments: ${error.message}`);
    }

    return (data ?? []).map((enrollment: any) => {
      const student = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students;
      const cls = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes;
      const firstSchedule = Array.isArray(cls?.class_schedules) ? cls.class_schedules[0] : null;

      const classItem = cls
        ? {
            id: cls.id,
            name: cls.name,
            day: firstSchedule?.weekday ? String(firstSchedule.weekday) : "-",
            time: firstSchedule?.start_time
              ? `${String(firstSchedule.start_time).slice(0, 5)}-${String(firstSchedule.end_time || "").slice(0, 5)}`
              : "-",
            price: Math.round((cls.price_cents || 0) / 100),
          }
        : null;

      const snapshot = enrollment.student_snapshot || {};

      return {
        id: enrollment.id,
        studentId: enrollment.student_id,
        classId: enrollment.class_id,
        studentName: student?.name || `${snapshot.first_name || ""} ${snapshot.last_name || ""}`.trim() || "Alumno",
        studentEmail: student?.email || snapshot.email || "",
        studentPhone: student?.phone || snapshot.phone || "",
        classes: classItem ? [classItem] : [],
        status: enrollment.status,
        totalPrice: classItem?.price || 0,
        paymentMethod: enrollment.payment_method || "No definido",
        date: enrollment.created_at,
        notes: enrollment.notes || undefined,
        attachments: (enrollment.enrollment_attachments || []).map((file: any) => file.file_name || file.file_path),
      };
    });
  },

  async updateEnrollmentStatus(
    tenantId: string,
    actorUserId: string,
    enrollmentId: string,
    nextStatus: EnrollmentStatus
  ) {
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .select("id, status, class_id")
      .eq("tenant_id", tenantId)
      .eq("id", enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error("Enrollment not found");
    }

    if (enrollment.status === nextStatus) {
      return { id: enrollment.id, status: enrollment.status, unchanged: true };
    }

    if (enrollment.status !== "pending") {
      throw new Error(`Cannot change status from ${enrollment.status}`);
    }

    if (nextStatus === "confirmed") {
      const { data: cls, error: classError } = await supabaseAdmin
        .from("classes")
        .select("id, capacity")
        .eq("tenant_id", tenantId)
        .eq("id", enrollment.class_id)
        .single();

      if (classError || !cls) {
        throw new Error("Class not found");
      }

      const { count, error: countError } = await supabaseAdmin
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("class_id", enrollment.class_id)
        .eq("status", "confirmed");

      if (countError) {
        throw new Error(`Failed to validate class capacity: ${countError.message}`);
      }

      if ((count || 0) >= cls.capacity) {
        throw new Error("Class capacity exceeded");
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("enrollments")
      .update({
        status: nextStatus,
        confirmed_at: nextStatus === "confirmed" ? new Date().toISOString() : null,
      })
      .eq("tenant_id", tenantId)
      .eq("id", enrollmentId)
      .select("id, status")
      .single();

    if (updateError || !updated) {
      throw new Error(`Failed to update enrollment status: ${updateError?.message}`);
    }

    await supabaseAdmin.from("audit_log").insert({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      action: "enrollment_status_updated",
      entity_type: "enrollment",
      entity_id: enrollmentId,
      metadata: {
        previousStatus: enrollment.status,
        newStatus: nextStatus,
      },
    });

    return { id: updated.id, status: updated.status, unchanged: false };
  },
};
