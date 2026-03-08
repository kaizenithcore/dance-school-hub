import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { CreateStudentInput, UpdateStudentInput } from "@/lib/validators/studentSchemas";

type Guardian = {
  name: string;
  phone: string;
  email?: string | null;
};

type StudentClassUpdateInput = {
  classIds: string[];
  jointEnrollmentGroupId?: string | null;
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
        date_of_birth,
        status,
        payment_type,
        join_date,
        notes,
        guardians(name, phone, email, is_primary),
        enrollments(
          id,
          status,
          joint_enrollment_group_id,
          classes(id, name, price_cents, class_schedules(weekday, start_time, end_time))
        )
      `
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`);
    }

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

          return {
            id: cls.id,
            name: cls.name,
            day,
            time,
            monthlyPrice: Math.round((cls.price_cents || 0) / 100),
          };
        })
        .filter(Boolean);

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        birthdate: student.date_of_birth,
        status: student.status,
        joinDate: student.join_date,
        notes: student.notes,
        paymentType: student.payment_type,
        jointEnrollmentGroupId: activeEnrollments.find((enrollment: any) => enrollment.joint_enrollment_group_id)?.joint_enrollment_group_id || null,
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
    const { data, error } = await supabaseAdmin
      .from("students")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        date_of_birth: input.birthdate ?? null,
        status: input.status,
        payment_type: input.paymentType,
        join_date: input.joinDate ?? undefined,
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
    if (input.birthdate !== undefined) payload.date_of_birth = input.birthdate ?? null;
    if (input.status !== undefined) payload.status = input.status;
    if (input.paymentType !== undefined) payload.payment_type = input.paymentType;
    if (input.joinDate !== undefined) payload.join_date = input.joinDate ?? null;
    if (input.notes !== undefined) payload.notes = input.notes ?? null;

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
  },

  async updateStudentClasses(tenantId: string, studentId: string, input: StudentClassUpdateInput) {
    const uniqueClassIds = Array.from(new Set((input.classIds || []).filter(Boolean)));

    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, name, email, phone")
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

      const fallbackGroupId = currentList.find((enrollment: any) => enrollment.joint_enrollment_group_id)?.joint_enrollment_group_id || null;
      const jointEnrollmentGroupId = input.jointEnrollmentGroupId ?? fallbackGroupId;

      const rows = toAdd.map((classId) => ({
        tenant_id: tenantId,
        student_id: studentId,
        class_id: classId,
        status: "confirmed",
        joint_enrollment_group_id: jointEnrollmentGroupId,
        student_snapshot: {
          first_name: String(student.name || "").split(" ")[0] || null,
          last_name: String(student.name || "").split(" ").slice(1).join(" ") || null,
          email: student.email,
          phone: student.phone,
          guardian_name: guardian?.name || null,
          guardian_email: guardian?.email || null,
          guardian_phone: guardian?.phone || null,
          updated_from_admin: true,
        },
      }));

      const { error: insertError } = await supabaseAdmin
        .from("enrollments")
        .insert(rows);

      if (insertError) {
        throw new Error(`Failed to create enrollments: ${insertError.message}`);
      }
    }

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
      .update({ status: "cancelled" })
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
