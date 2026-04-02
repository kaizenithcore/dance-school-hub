import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { CreateStudentInput, UpdateStudentInput } from "@/lib/validators/studentSchemas";
import { studentQuotaService } from "@/lib/services/studentQuotaService";
import { pricingService } from "@/lib/services/pricingService";
import { communicationService } from "@/lib/services/communicationService";
import { studentFieldService } from "@/lib/services/studentFieldService";
import type { ClassSelection } from "@/lib/types/pricing";

type Guardian = {
  name: string;
  phone: string;
  email?: string | null;
};

type StudentClassUpdateInput = {
  classIds: string[];
  jointEnrollmentGroupId?: string | null;
  selections?: Array<{ classId: string; scheduleIds?: string[] }>;
  _skipGroupPropagation?: boolean;
};

async function replaceGuardian(tenantId: string, studentId: string, guardian?: Guardian) {
  await supabaseAdmin.from("guardians").delete().eq("tenant_id", tenantId).eq("student_id", studentId);

  if (!guardian) {
    return;
  }

  const { error } = await supabaseAdmin.from("guardians").insert({
    tenant_id: tenantId,
    student_id: studentId,
    name: guardian.name,
    phone: guardian.phone,
    email: guardian.email ?? null,
    relation: "guardian",
    is_primary: true,
  });

  if (error) {
    throw new Error(`Failed to save guardian: ${error.message}`);
  }
}

async function syncActiveEnrollmentSnapshotsForStudent(tenantId: string, studentId: string) {
  const { data: student, error: studentError } = await supabaseAdmin
    .from("students")
    .select("id, name, email, phone, preferred_payment_method")
    .eq("tenant_id", tenantId)
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    throw new Error("Student not found while syncing enrollments");
  }

  const { data: guardian } = await supabaseAdmin
    .from("guardians")
    .select("name, email, phone")
    .eq("tenant_id", tenantId)
    .eq("student_id", studentId)
    .eq("is_primary", true)
    .maybeSingle();

  const { data: activeEnrollments, error: enrollmentsError } = await supabaseAdmin
    .from("enrollments")
    .select("id, student_snapshot")
    .eq("tenant_id", tenantId)
    .eq("student_id", studentId)
    .in("status", ["pending", "confirmed"]);

  if (enrollmentsError) {
    throw new Error(`Failed to load active enrollments for sync: ${enrollmentsError.message}`);
  }

  for (const enrollment of activeEnrollments || []) {
    const existingSnapshot = enrollment.student_snapshot && typeof enrollment.student_snapshot === "object"
      ? (enrollment.student_snapshot as Record<string, unknown>)
      : {};

    const selectedScheduleIdsRaw = existingSnapshot.selected_schedule_ids;
    const selectedScheduleIds = Array.isArray(selectedScheduleIdsRaw)
      ? selectedScheduleIdsRaw.filter((value): value is string => typeof value === "string")
      : [];

    const nextSnapshot = {
      ...existingSnapshot,
      first_name: String(student.name || "").split(" ")[0] || null,
      last_name: String(student.name || "").split(" ").slice(1).join(" ") || null,
      email: student.email,
      phone: student.phone,
      guardian_name: guardian?.name || null,
      guardian_email: guardian?.email || null,
      guardian_phone: guardian?.phone || null,
      selected_schedule_ids: selectedScheduleIds,
      updated_from_admin: true,
    };

    const { error: updateEnrollmentError } = await supabaseAdmin
      .from("enrollments")
      .update({
        payment_method: student.preferred_payment_method || "cash",
        student_snapshot: nextSnapshot,
      })
      .eq("tenant_id", tenantId)
      .eq("id", enrollment.id);

    if (updateEnrollmentError) {
      throw new Error(`Failed to sync enrollment snapshot: ${updateEnrollmentError.message}`);
    }
  }
}

export const studentService = {
  async listStudents(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from("students")
      .select(
        `
        id,
        name,
        email,
        phone,
        address,
        locality,
        identity_document_type,
        identity_document_number,
        date_of_birth,
        status,
        payment_type,
        payer_type,
        payer_name,
        payer_email,
        payer_phone,
        preferred_payment_method,
        account_number,
        join_date,
        extra_data,
        notes,
        guardians(name, phone, email, is_primary),
        enrollments(
          id,
          status,
          joint_enrollment_group_id,
          student_snapshot,
          classes(id, name, discipline_id, price_cents, class_schedules(id, weekday, start_time, end_time))
        )
      `
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`);
    }

    const groupPricingInput = new Map<string, { selections: ClassSelection[]; memberIds: Set<string> }>();

    for (const studentRow of data || []) {
      const activeEnrollments = (studentRow.enrollments || []).filter(
        (enrollment: any) => enrollment.status === "pending" || enrollment.status === "confirmed"
      );

      for (const enrollment of activeEnrollments) {
        const groupId = enrollment.joint_enrollment_group_id;
        const cls = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes;
        if (!groupId || !cls) {
          continue;
        }

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

        const groupData = groupPricingInput.get(groupId) || {
          selections: [],
          memberIds: new Set<string>(),
        };

        groupData.memberIds.add(studentRow.id);
        groupData.selections.push({
          class_id: cls.id,
          discipline_id: cls.discipline_id || "general",
          discipline_name: cls.name || "Clase",
          hours_per_week: normalizedSelectedHours,
          base_price: Math.round(((cls.price_cents || 0) / 100) * ratio * 100) / 100,
        });

        groupPricingInput.set(groupId, groupData);
      }
    }

    const studentPricingInput = new Map<string, ClassSelection[]>();

    for (const studentRow of data || []) {
      const activeEnrollments = (studentRow.enrollments || []).filter(
        (enrollment: any) => enrollment.status === "pending" || enrollment.status === "confirmed"
      );

      const selections: ClassSelection[] = [];
      for (const enrollment of activeEnrollments) {
        const cls = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes;
        if (!cls) {
          continue;
        }

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

        selections.push({
          class_id: cls.id,
          discipline_id: cls.discipline_id || "general",
          discipline_name: cls.name || "Clase",
          hours_per_week: normalizedSelectedHours,
          base_price: Math.round(((cls.price_cents || 0) / 100) * ratio * 100) / 100,
        });
      }

      studentPricingInput.set(studentRow.id, selections);
    }

    const groupPricingById = new Map<string, { total: number; perMember: number }>();
    await Promise.all(
      Array.from(groupPricingInput.entries()).map(async ([groupId, payload]) => {
        try {
          const pricing = await pricingService.calculatePricing(tenantId, payload.selections);
          const memberCount = Math.max(1, payload.memberIds.size);
          groupPricingById.set(groupId, {
            total: pricing.total,
            perMember: pricing.total / memberCount,
          });
        } catch {
          // Fallback: if pricing calculation fails, keep base behavior.
        }
      })
    );

    const studentPricingById = new Map<string, number>();
    await Promise.all(
      Array.from(studentPricingInput.entries()).map(async ([studentId, selections]) => {
        if (selections.length === 0) {
          studentPricingById.set(studentId, 0);
          return;
        }

        try {
          const pricing = await pricingService.calculatePricing(tenantId, selections);
          studentPricingById.set(studentId, Math.round(pricing.total * 100) / 100);
        } catch {
          const fallbackTotal = selections.reduce((sum, item) => sum + Number(item.base_price || 0), 0);
          studentPricingById.set(studentId, Math.round(fallbackTotal * 100) / 100);
        }
      })
    );

    return (data ?? []).map((student: any) => {
      const primaryGuardian = (student.guardians || []).find((g: any) => g.is_primary) || student.guardians?.[0] || null;
      const activeEnrollments = (student.enrollments || []).filter(
        (enrollment: any) => enrollment.status === "pending" || enrollment.status === "confirmed"
      );

      const enrolledClasses = activeEnrollments
        .map((enrollment: any) => {
          const cls = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes;
          if (!cls) return null;

          const firstSchedule = Array.isArray(cls.class_schedules) ? cls.class_schedules[0] : null;
          const day = firstSchedule?.weekday ? String(firstSchedule.weekday) : "-";
          const time = firstSchedule?.start_time
            ? `${String(firstSchedule.start_time).slice(0, 5)}-${String(firstSchedule.end_time || "").slice(0, 5)}`
            : "-";

          const selectedScheduleIdsRaw = enrollment?.student_snapshot?.selected_schedule_ids;
          const selectedScheduleIds = Array.isArray(selectedScheduleIdsRaw)
            ? selectedScheduleIdsRaw.filter((value: unknown): value is string => typeof value === "string")
            : [];

          return {
            id: cls.id,
            name: cls.name,
            day,
            time,
            monthlyPrice: Math.round((cls.price_cents || 0) / 100),
            selectedScheduleIds,
          };
        })
        .filter(Boolean);

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        address: student.address,
        locality: student.locality,
        identityDocumentType: student.identity_document_type,
        identityDocumentNumber: student.identity_document_number,
        birthdate: student.date_of_birth,
        status: student.status,
        joinDate: student.join_date,
        notes: student.notes,
        paymentType: student.payment_type,
        payerType: student.payer_type || "student",
        payerName: student.payer_name || undefined,
        payerEmail: student.payer_email || undefined,
        payerPhone: student.payer_phone || undefined,
        preferredPaymentMethod: student.preferred_payment_method || "cash",
        accountNumber: student.account_number || undefined,
        extraData: student.extra_data && typeof student.extra_data === "object" ? student.extra_data : {},
        jointEnrollmentGroupId: activeEnrollments.find((enrollment: any) => enrollment.joint_enrollment_group_id)?.joint_enrollment_group_id || null,
        monthlyTotalOverride: (() => {
          const groupId = activeEnrollments.find((enrollment: any) => enrollment.joint_enrollment_group_id)?.joint_enrollment_group_id;
          if (!groupId) {
            return studentPricingById.get(student.id);
          }
          const pricing = groupPricingById.get(groupId);
          return pricing ? Math.round(pricing.perMember * 100) / 100 : undefined;
        })(),
        guardian: primaryGuardian
          ? {
              name: primaryGuardian.name,
              phone: primaryGuardian.phone,
              email: primaryGuardian.email,
            }
          : undefined,
        enrolledClasses,
      };
    });
  },

  async createStudent(tenantId: string, input: CreateStudentInput) {
    await studentQuotaService.assertCanAddStudents(tenantId, 1);

    const normalizedExtraData = await studentFieldService.normalizeAndValidateExtraData(
      tenantId,
      studentFieldService.mergeExtraDataFromInput(input as Record<string, unknown>)
    );

    const { data, error } = await supabaseAdmin
      .from("students")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address ?? null,
        locality: input.locality ?? null,
        identity_document_type: input.identityDocumentType ?? null,
        identity_document_number: input.identityDocumentNumber ?? null,
        date_of_birth: input.birthdate ?? null,
        status: input.status,
        payment_type: input.paymentType,
        payer_type: input.payerType ?? "student",
        payer_name: input.payerType === "other" ? input.payerName ?? null : null,
        payer_email: input.payerType === "other" ? input.payerEmail ?? null : null,
        payer_phone: input.payerType === "other" ? input.payerPhone ?? null : null,
        preferred_payment_method: input.preferredPaymentMethod ?? "cash",
        account_number: (input.preferredPaymentMethod ?? "cash") === "transfer" ? input.accountNumber ?? null : null,
        join_date: input.joinDate ?? undefined,
        extra_data: normalizedExtraData,
        notes: input.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create student: ${error?.message}`);
    }

    try {
      await replaceGuardian(tenantId, data.id, input.guardian);

      let classIdsToAssign = Array.from(new Set((input.classIds || []).filter(Boolean)));

      // If no class is provided on creation, auto-link the student to one class to keep
      // the admin flow fast and ensure attendance sheets can include newly created students.
      if (classIdsToAssign.length === 0) {
        const { data: classesWithSchedule } = await supabaseAdmin
          .from("classes")
          .select("id, class_schedules!inner(id, is_active)")
          .eq("tenant_id", tenantId)
          .neq("status", "inactive")
          .eq("class_schedules.is_active", true)
          .order("created_at", { ascending: true })
          .limit(1);

        const fallbackClassId = classesWithSchedule?.[0]?.id;
        if (fallbackClassId) {
          classIdsToAssign = [fallbackClassId];
        }
      }

      if (classIdsToAssign.length > 0) {
        await this.updateStudentClasses(tenantId, data.id, {
          classIds: classIdsToAssign,
          jointEnrollmentGroupId: input.jointEnrollmentGroupId ?? null,
        });
      }
    } catch (postCreateError) {
      // Keep create flow transactional-like: if post steps fail, remove the student.
      await supabaseAdmin.from("students").delete().eq("tenant_id", tenantId).eq("id", data.id);
      throw postCreateError;
    }

    return data;
  },

  async updateStudent(tenantId: string, studentId: string, input: UpdateStudentInput) {
    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) payload.name = input.name;
    if (input.email !== undefined) payload.email = input.email;
    if (input.phone !== undefined) payload.phone = input.phone;
    if (input.address !== undefined) payload.address = input.address ?? null;
    if (input.locality !== undefined) payload.locality = input.locality ?? null;
    if (input.identityDocumentType !== undefined) payload.identity_document_type = input.identityDocumentType ?? null;
    if (input.identityDocumentNumber !== undefined) payload.identity_document_number = input.identityDocumentNumber ?? null;
    if (input.birthdate !== undefined) payload.date_of_birth = input.birthdate ?? null;
    if (input.status !== undefined) payload.status = input.status;
    if (input.paymentType !== undefined) payload.payment_type = input.paymentType;
    if (input.payerType !== undefined) payload.payer_type = input.payerType;
    if (input.payerType !== undefined || input.payerName !== undefined) {
      const payerType = input.payerType;
      payload.payer_name = payerType === "other" ? (input.payerName ?? null) : null;
    }
    if (input.payerType !== undefined || input.payerEmail !== undefined) {
      const payerType = input.payerType;
      payload.payer_email = payerType === "other" ? (input.payerEmail ?? null) : null;
    }
    if (input.payerType !== undefined || input.payerPhone !== undefined) {
      const payerType = input.payerType;
      payload.payer_phone = payerType === "other" ? (input.payerPhone ?? null) : null;
    }
    if (input.preferredPaymentMethod !== undefined) payload.preferred_payment_method = input.preferredPaymentMethod;
    if (input.preferredPaymentMethod !== undefined || input.accountNumber !== undefined) {
      const preferredPaymentMethod = input.preferredPaymentMethod;
      payload.account_number = preferredPaymentMethod === "transfer" ? (input.accountNumber ?? null) : null;
    }
    if (input.joinDate !== undefined) payload.join_date = input.joinDate ?? null;
    if (input.notes !== undefined) payload.notes = input.notes ?? null;

    if (input.extraData !== undefined || input.extra_data !== undefined) {
      payload.extra_data = await studentFieldService.normalizeAndValidateExtraData(
        tenantId,
        studentFieldService.mergeExtraDataFromInput(input as Record<string, unknown>)
      );
    }

    if (Object.keys(payload).length > 0) {
      const { error } = await supabaseAdmin
        .from("students")
        .update(payload)
        .eq("tenant_id", tenantId)
        .eq("id", studentId);

      if (error) {
        throw new Error(`Failed to update student: ${error.message}`);
      }
    }

    if (input.guardian !== undefined) {
      await replaceGuardian(tenantId, studentId, input.guardian);
    }

    if (input.classIds !== undefined) {
      await this.updateStudentClasses(tenantId, studentId, {
        classIds: input.classIds,
        jointEnrollmentGroupId: input.jointEnrollmentGroupId ?? undefined,
      });
    }

    await syncActiveEnrollmentSnapshotsForStudent(tenantId, studentId);
  },

  async updateStudentClasses(tenantId: string, studentId: string, input: StudentClassUpdateInput) {
    const uniqueClassIds = Array.from(new Set((input.classIds || []).filter(Boolean)));
    const selectionMap = new Map(
      (input.selections || []).map((selection) => [
        selection.classId,
        Array.from(new Set((selection.scheduleIds || []).filter(Boolean))),
      ])
    );

    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, name, email, phone, preferred_payment_method")
      .eq("tenant_id", tenantId)
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      throw new Error("Student not found");
    }

    const { data: guardian } = await supabaseAdmin
      .from("guardians")
      .select("name, email, phone")
      .eq("tenant_id", tenantId)
      .eq("student_id", studentId)
      .eq("is_primary", true)
      .maybeSingle();

    const { data: currentEnrollments, error: currentError } = await supabaseAdmin
      .from("enrollments")
      .select("id, class_id, joint_enrollment_group_id, status")
      .eq("tenant_id", tenantId)
      .eq("student_id", studentId)
      .in("status", ["pending", "confirmed"]);

    if (currentError) {
      throw new Error(`Failed to load current enrollments: ${currentError.message}`);
    }

    const currentList = currentEnrollments || [];
    const previousGroupId = currentList.find((enrollment: any) => enrollment.joint_enrollment_group_id)?.joint_enrollment_group_id || null;
    const currentClassIds = new Set(currentList.map((enrollment: any) => enrollment.class_id));
    const targetClassIds = new Set(uniqueClassIds);

    const toCancel = currentList.filter((enrollment: any) => !targetClassIds.has(enrollment.class_id));
    const toAdd = uniqueClassIds.filter((classId) => !currentClassIds.has(classId));

    if (toCancel.length > 0) {
      const { error: cancelError } = await supabaseAdmin
        .from("enrollments")
        .update({ status: "cancelled" })
        .in("id", toCancel.map((enrollment: any) => enrollment.id));

      if (cancelError) {
        throw new Error(`Failed to update enrollments: ${cancelError.message}`);
      }
    }

    if (toAdd.length > 0) {
      const { data: classData, error: classError } = await supabaseAdmin
        .from("classes")
        .select("id, capacity")
        .eq("tenant_id", tenantId)
        .neq("status", "inactive")
        .in("id", toAdd);

      if (classError || !classData || classData.length !== toAdd.length) {
        throw new Error("One or more selected classes are invalid");
      }

      const { data: confirmedEnrollments } = await supabaseAdmin
        .from("enrollments")
        .select("class_id")
        .eq("tenant_id", tenantId)
        .eq("status", "confirmed")
        .in("class_id", toAdd);

      const confirmedCountByClass = new Map<string, number>();
      (confirmedEnrollments || []).forEach((enrollment: { class_id: string }) => {
        confirmedCountByClass.set(
          enrollment.class_id,
          (confirmedCountByClass.get(enrollment.class_id) || 0) + 1
        );
      });

      for (const selectedClass of classData as any[]) {
        const enrolledCount = confirmedCountByClass.get(selectedClass.id) || 0;
        if (enrolledCount >= selectedClass.capacity) {
          throw new Error("Class is full");
        }
      }

      const fallbackGroupId = previousGroupId;
      const jointEnrollmentGroupId = input.jointEnrollmentGroupId ?? fallbackGroupId;

      const { data: reusableEnrollments, error: reusableEnrollmentsError } = await supabaseAdmin
        .from("enrollments")
        .select("id, class_id")
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .eq("status", "cancelled")
        .in("class_id", toAdd);

      if (reusableEnrollmentsError) {
        throw new Error(`Failed to load reusable enrollments: ${reusableEnrollmentsError.message}`);
      }

      const reusableByClassId = new Map<string, string>(
        (reusableEnrollments || [])
          .filter((row: any) => row?.id && row?.class_id)
          .map((row: any) => [row.class_id as string, row.id as string])
      );

      for (const classId of toAdd.filter((id) => reusableByClassId.has(id))) {
        const selectedScheduleIds = selectionMap.get(classId) || [];
        const enrollmentId = reusableByClassId.get(classId);

        const { error: reactivateEnrollmentError } = await supabaseAdmin
          .from("enrollments")
          .update({
            status: "confirmed",
            payment_method: student.preferred_payment_method || "cash",
            joint_enrollment_group_id: jointEnrollmentGroupId,
            student_snapshot: {
              first_name: String(student.name || "").split(" ")[0] || null,
              last_name: String(student.name || "").split(" ").slice(1).join(" ") || null,
              email: student.email,
              phone: student.phone,
              guardian_name: guardian?.name || null,
              guardian_email: guardian?.email || null,
              guardian_phone: guardian?.phone || null,
              selected_schedule_ids: selectedScheduleIds,
              updated_from_admin: true,
            },
          })
          .eq("tenant_id", tenantId)
          .eq("id", enrollmentId);

        if (reactivateEnrollmentError) {
          throw new Error(`Failed to reactivate enrollment: ${reactivateEnrollmentError.message}`);
        }
      }

      const classesToInsert = toAdd.filter((classId) => !reusableByClassId.has(classId));

      const rows = classesToInsert.map((classId) => ({
        tenant_id: tenantId,
        student_id: studentId,
        class_id: classId,
        status: "confirmed",
        payment_method: student.preferred_payment_method || "cash",
        joint_enrollment_group_id: jointEnrollmentGroupId,
        student_snapshot: {
          first_name: String(student.name || "").split(" ")[0] || null,
          last_name: String(student.name || "").split(" ").slice(1).join(" ") || null,
          email: student.email,
          phone: student.phone,
          guardian_name: guardian?.name || null,
          guardian_email: guardian?.email || null,
          guardian_phone: guardian?.phone || null,
          selected_schedule_ids: selectionMap.get(classId) || [],
          updated_from_admin: true,
        },
      }));

      const { error: insertError } = rows.length
        ? await supabaseAdmin.from("enrollments").insert(rows)
        : { error: null };

      if (insertError) {
        throw new Error(`Failed to create enrollments: ${insertError.message}`);
      }
    }

    const resolvedGroupId = input.jointEnrollmentGroupId !== undefined
      ? input.jointEnrollmentGroupId
      : previousGroupId;

    if (currentList.some((item: any) => targetClassIds.has(item.class_id))) {
      for (const enrollment of currentList.filter((item: any) => targetClassIds.has(item.class_id))) {
        const selectedScheduleIds = selectionMap.get(enrollment.class_id) || [];
        const { error: updateEnrollmentError } = await supabaseAdmin
          .from("enrollments")
          .update({
            payment_method: student.preferred_payment_method || "cash",
            joint_enrollment_group_id: resolvedGroupId,
            student_snapshot: {
              first_name: String(student.name || "").split(" ")[0] || null,
              last_name: String(student.name || "").split(" ").slice(1).join(" ") || null,
              email: student.email,
              phone: student.phone,
              guardian_name: guardian?.name || null,
              guardian_email: guardian?.email || null,
              guardian_phone: guardian?.phone || null,
              selected_schedule_ids: selectedScheduleIds,
              updated_from_admin: true,
            },
          })
          .eq("id", enrollment.id)
          .eq("tenant_id", tenantId);

        if (updateEnrollmentError) {
          throw new Error(`Failed to update enrollment details: ${updateEnrollmentError.message}`);
        }
      }
    }

    // Dissolve an existing group for all members when explicitly set to null.
    if (input.jointEnrollmentGroupId === null && previousGroupId) {
      const { error: dissolveError } = await supabaseAdmin
        .from("enrollments")
        .update({ joint_enrollment_group_id: null })
        .eq("tenant_id", tenantId)
        .eq("joint_enrollment_group_id", previousGroupId)
        .in("status", ["pending", "confirmed"]);

      if (dissolveError) {
        throw new Error(`Failed to dissolve joint enrollment group: ${dissolveError.message}`);
      }
    }

    // When a group is selected, propagate classes/schedules to all current group members.
    if (!input._skipGroupPropagation && resolvedGroupId) {
      const { data: groupMembers, error: groupMembersError } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .eq("tenant_id", tenantId)
        .eq("joint_enrollment_group_id", resolvedGroupId)
        .in("status", ["pending", "confirmed"]);

      if (groupMembersError) {
        throw new Error(`Failed to load joint group members: ${groupMembersError.message}`);
      }

      const memberIds = Array.from(new Set((groupMembers || []).map((row: any) => row.student_id))).filter(
        (id) => id && id !== studentId
      );

      for (const memberId of memberIds) {
        await this.updateStudentClasses(tenantId, memberId, {
          classIds: uniqueClassIds,
          jointEnrollmentGroupId: resolvedGroupId,
          selections: input.selections,
          _skipGroupPropagation: true,
        });
      }
    }

    await syncActiveEnrollmentSnapshotsForStudent(tenantId, studentId);

    return { updated: true };
  },

  async getJointGroupMembers(tenantId: string, groupId: string) {
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, students(id, name, email)")
      .eq("tenant_id", tenantId)
      .eq("joint_enrollment_group_id", groupId)
      .in("status", ["pending", "confirmed"]);

    if (error) {
      throw new Error(`Failed to fetch joint group members: ${error.message}`);
    }

    const seen = new Set<string>();
    return (data || [])
      .map((row: any) => Array.isArray(row.students) ? row.students[0] : row.students)
      .filter((student: any) => {
        if (!student?.id || seen.has(student.id)) return false;
        seen.add(student.id);
        return true;
      })
      .map((student: any) => ({ id: student.id, name: student.name, email: student.email }));
  },

  async removeMemberFromJointGroup(tenantId: string, groupId: string, studentId: string) {
    const { error } = await supabaseAdmin
      .from("enrollments")
      .update({ joint_enrollment_group_id: null })
      .eq("tenant_id", tenantId)
      .eq("joint_enrollment_group_id", groupId)
      .eq("student_id", studentId)
      .in("status", ["pending", "confirmed"]);

    if (error) {
      throw new Error(`Failed to remove member from joint group: ${error.message}`);
    }

    return { removed: true };
  },

  async addMemberToJointGroup(tenantId: string, groupId: string, studentId: string) {
    const { data: groupEnrollments, error: groupError } = await supabaseAdmin
      .from("enrollments")
      .select("class_id")
      .eq("tenant_id", tenantId)
      .eq("joint_enrollment_group_id", groupId)
      .in("status", ["pending", "confirmed"])
      .limit(20);

    if (groupError || !groupEnrollments || groupEnrollments.length === 0) {
      throw new Error("Joint enrollment group not found");
    }

    const classIds = Array.from(new Set(groupEnrollments.map((row: any) => row.class_id)));
    await this.updateStudentClasses(tenantId, studentId, { classIds, jointEnrollmentGroupId: groupId });
    return { added: true };
  },

  async deleteStudent(tenantId: string, studentId: string) {
    await communicationService.purgePendingDeliveriesForStudent(tenantId, studentId);

    const { error } = await supabaseAdmin
      .from("students")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", studentId);

    if (error) {
      throw new Error(`Failed to delete student: ${error.message}`);
    }
  },
};
