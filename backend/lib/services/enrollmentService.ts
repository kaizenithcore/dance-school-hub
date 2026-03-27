import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export type EnrollmentStatus = "pending" | "confirmed" | "declined" | "cancelled";

type SnapshotLike = Record<string, unknown>;

function pickSnapshotString(snapshot: SnapshotLike, keys: string[]) {
  for (const key of keys) {
    const value = snapshot[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function pickFormValueString(snapshot: SnapshotLike, keys: string[]) {
  const formValuesRaw = snapshot.form_values;
  if (!formValuesRaw || typeof formValuesRaw !== "object") {
    return null;
  }

  const formValues = formValuesRaw as SnapshotLike;
  return pickSnapshotString(formValues, keys);
}

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
        students(name, email, phone, date_of_birth, account_number),
        classes(id, name, price_cents, class_schedules(weekday, start_time, end_time)),
        enrollment_attachments(file_name, file_path)
      `
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch enrollments: ${error.message}`);
    }

    const studentIds = Array.from(
      new Set(
        (data || [])
          .map((enrollment: any) => enrollment.student_id)
          .filter((studentId: unknown): studentId is string => typeof studentId === "string" && studentId.length > 0)
      )
    );

    const guardiansByStudent = new Map<string, Array<{ name: string; email: string | null; phone: string | null; is_primary: boolean }>>();

    if (studentIds.length > 0) {
      const { data: guardians, error: guardiansError } = await supabaseAdmin
        .from("guardians")
        .select("student_id, name, email, phone, is_primary")
        .eq("tenant_id", tenantId)
        .in("student_id", studentIds);

      if (guardiansError) {
        throw new Error(`Failed to fetch guardians for enrollments: ${guardiansError.message}`);
      }

      for (const guardian of guardians || []) {
        const current = guardiansByStudent.get(guardian.student_id) || [];
        current.push(guardian);
        guardiansByStudent.set(guardian.student_id, current);
      }
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

      const snapshot = enrollment.student_snapshot && typeof enrollment.student_snapshot === "object"
        ? (enrollment.student_snapshot as SnapshotLike)
        : {};

      const guardians = guardiansByStudent.get(enrollment.student_id) || [];
      const orderedGuardians = [...guardians].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
      const snapshotGuardianName = pickSnapshotString(snapshot, ["guardian_name", "tutor_name"])
        || pickFormValueString(snapshot, ["guardian_name", "tutor_name"]);
      const snapshotGuardianEmail = pickSnapshotString(snapshot, ["guardian_email", "tutor_email"])
        || pickFormValueString(snapshot, ["guardian_email", "tutor_email"]);
      const snapshotGuardianPhone = pickSnapshotString(snapshot, ["guardian_phone", "tutor_phone"])
        || pickFormValueString(snapshot, ["guardian_phone", "tutor_phone"]);
      const fallbackGuardian = snapshotGuardianName || snapshotGuardianEmail || snapshotGuardianPhone
        ? [{
            name: snapshotGuardianName || "Tutor",
            email: snapshotGuardianEmail,
            phone: snapshotGuardianPhone,
          }]
        : [];

      const birthDate = student?.date_of_birth
        || pickSnapshotString(snapshot, ["date_of_birth", "student_birthdate"])
        || pickFormValueString(snapshot, ["date_of_birth", "student_birthdate"]);
      const accountNumber = student?.account_number
        || pickSnapshotString(snapshot, ["account_number", "iban", "cbu"])
        || pickFormValueString(snapshot, ["account_number", "iban", "cbu"]);

      return {
        id: enrollment.id,
        studentId: enrollment.student_id,
        classId: enrollment.class_id,
        studentName: student?.name || `${snapshot.first_name || ""} ${snapshot.last_name || ""}`.trim() || "Alumno",
        studentEmail: student?.email || snapshot.email || "",
        studentPhone: student?.phone || snapshot.phone || "",
        studentBirthDate: birthDate || undefined,
        studentIban: accountNumber || undefined,
        guardians: orderedGuardians.length > 0
          ? orderedGuardians.map((guardian) => ({
              name: guardian.name,
              email: guardian.email || undefined,
              phone: guardian.phone || undefined,
            }))
          : fallbackGuardian,
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
