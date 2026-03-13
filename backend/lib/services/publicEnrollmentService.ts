import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { PublicEnrollmentInput, JointEnrollmentInput } from "@/lib/validators/publicEnrollmentSchemas";
import { enrollmentFormConfigService } from "@/lib/services/enrollmentFormConfigService";
import { waitlistService } from "@/lib/services/waitlistService";
import { studentQuotaService } from "@/lib/services/studentQuotaService";

function normalizeName(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export interface PublicSchoolProfile {
  tagline?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface PublicFormData {
  tenantId: string;
  tenantName: string;
  formConfig: unknown;
  publicProfile?: PublicSchoolProfile;
  scheduleConfig?: {
    startHour?: string;
    endHour?: string;
    recurringSelectionMode?: "linked" | "single_day";
  };
  availableClasses: Array<{
    id: string;
    name: string;
    discipline: string;
    category: string;
    price_cents: number;
    capacity: number;
    enrolled_count: number;
    schedules?: Array<{
      id: string;
      day: string;
      startHour: number;
      duration: number;
      room: string;
    }>;
  }>;
}

export const publicEnrollmentService = {
  /**
   * Get public form configuration for a tenant
   */
  async getFormData(tenantSlug: string): Promise<PublicFormData | null> {
    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("slug", tenantSlug)
      .eq("is_active", true)
      .single();

    if (tenantError || !tenant) {
      return null;
    }

    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from("school_settings")
      .select("enrollment_config, schedule_config")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching school settings:", settingsError);
    }

    const enrollmentConfig =
      settingsData?.enrollment_config && typeof settingsData.enrollment_config === "object"
        ? (settingsData.enrollment_config as Record<string, unknown>)
        : {};

    const profileSource =
      (enrollmentConfig.public_profile && typeof enrollmentConfig.public_profile === "object"
        ? (enrollmentConfig.public_profile as Record<string, unknown>)
        : enrollmentConfig.publicProfile && typeof enrollmentConfig.publicProfile === "object"
          ? (enrollmentConfig.publicProfile as Record<string, unknown>)
          : {}) || {};

    const publicProfile = {
      tagline: typeof profileSource.tagline === "string" ? profileSource.tagline : undefined,
      description: typeof profileSource.description === "string" ? profileSource.description : undefined,
      address: typeof profileSource.address === "string" ? profileSource.address : undefined,
      phone: typeof profileSource.phone === "string" ? profileSource.phone : undefined,
      email: typeof profileSource.email === "string" ? profileSource.email : undefined,
      website: typeof profileSource.website === "string" ? profileSource.website : undefined,
      instagram: typeof profileSource.instagram === "string" ? profileSource.instagram : undefined,
      facebook: typeof profileSource.facebook === "string" ? profileSource.facebook : undefined,
      tiktok: typeof profileSource.tiktok === "string" ? profileSource.tiktok : undefined,
    };

    const scheduleConfigSource =
      settingsData?.schedule_config && typeof settingsData.schedule_config === "object"
        ? (settingsData.schedule_config as Record<string, unknown>)
        : {};

    const scheduleConfig = {
      startHour: typeof scheduleConfigSource.startHour === "string" ? scheduleConfigSource.startHour : undefined,
      endHour: typeof scheduleConfigSource.endHour === "string" ? scheduleConfigSource.endHour : undefined,
      recurringSelectionMode:
        scheduleConfigSource.recurringSelectionMode === "single_day" || scheduleConfigSource.recurringSelectionMode === "linked"
          ? scheduleConfigSource.recurringSelectionMode
          : undefined,
    };

    // Get active classes with enrollment count
    const { data: classes, error: classesError } = await supabaseAdmin
      .from("classes")
      .select(`
        id,
        name,
        discipline_id,
        category_id,
        price_cents,
        capacity
      `)
      .eq("tenant_id", tenant.id)
      .eq("status", "active");

    if (classesError) {
      console.error("Error fetching classes:", classesError);
      const formConfig = await enrollmentFormConfigService.getByTenantId(tenant.id);
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        formConfig,
        publicProfile,
        scheduleConfig,
        availableClasses: [],
      };
    }

    // Get schedules for all classes
    const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const classIds = (classes || []).map((c: { id: string }) => c.id);
    const { data: schedules } = await supabaseAdmin
      .from("class_schedules")
      .select(`
        id,
        class_id,
        weekday,
        start_time,
        end_time,
        room_id,
        rooms(name)
      `)
      .in("class_id", classIds);

    // Group schedules by class_id
    const schedulesByClass = new Map<string, Array<{
      id: string;
      day: string;
      startHour: number;
      duration: number;
      room: string;
    }>>();

    (schedules || []).forEach((schedule: unknown) => {
      const s = schedule as { id: string; class_id: string; weekday: number; start_time: string; end_time: string; rooms?: { name: string } | null };
      
      // Convert start_time (HH:MM:SS) to hour number
      const startHour = parseInt(s.start_time.split(':')[0], 10);
      const endHour = parseInt(s.end_time.split(':')[0], 10);
      const startMinutes = parseInt(s.start_time.split(':')[1], 10);
      const endMinutes = parseInt(s.end_time.split(':')[1], 10);
      
      // Calculate duration in hours (with decimal for minutes)
      const duration = (endHour - startHour) + (endMinutes - startMinutes) / 60;
      
      const classSchedules = schedulesByClass.get(s.class_id) || [];
      classSchedules.push({
        id: s.id,
        day: WEEKDAYS[s.weekday - 1] || 'Lunes', // weekday is 1-7, array is 0-6
        startHour,
        duration,
        room: s.rooms?.name || "Sin aula",
      });
      schedulesByClass.set(s.class_id, classSchedules);
    });

    // Get disciplines and categories for mapping
    const { data: disciplines } = await supabaseAdmin
      .from("disciplines")
      .select("id, name")
      .eq("tenant_id", tenant.id);

    const { data: categories } = await supabaseAdmin
      .from("categories")
      .select("id, name")
      .eq("tenant_id", tenant.id);

    const disciplineMap = new Map((disciplines || []).map((d) => [d.id, d.name]));
    const categoryMap = new Map((categories || []).map((c) => [c.id, c.name]));

    const confirmedEnrollmentsByClass = new Map<string, number>();
    if ((classes || []).length > 0) {
      const { data: confirmedEnrollments } = await supabaseAdmin
        .from("enrollments")
        .select("class_id")
        .eq("tenant_id", tenant.id)
        .eq("status", "confirmed")
        .in("class_id", classes.map((c: { id: string }) => c.id));

      (confirmedEnrollments || []).forEach((enrollment: { class_id: string }) => {
        confirmedEnrollmentsByClass.set(
          enrollment.class_id,
          (confirmedEnrollmentsByClass.get(enrollment.class_id) || 0) + 1
        );
      });
    }

    const availableClasses = (classes || []).map((cls: { id: string; name: string; discipline_id: string; category_id: string; price_cents: number; capacity: number }) => ({
      id: cls.id,
      name: cls.name,
      discipline: disciplineMap.get(cls.discipline_id) || "General",
      category: categoryMap.get(cls.category_id) || "General",
      price_cents: cls.price_cents,
      capacity: cls.capacity,
      enrolled_count: confirmedEnrollmentsByClass.get(cls.id) || 0,
      schedules: schedulesByClass.get(cls.id) || [],
    }));

    const formConfig = await enrollmentFormConfigService.getByTenantId(tenant.id);

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      formConfig,
      publicProfile,
      scheduleConfig,
      availableClasses,
    };
  },

  /**
   * Create a new public enrollment
   */
  async createEnrollment(
    tenantSlug: string,
    input: PublicEnrollmentInput
  ): Promise<{ enrollmentId?: string; studentId?: string; waitlistCreated?: boolean; waitlistCount?: number; message?: string }> {
        const classIds = Array.from(new Set((input.class_ids && input.class_ids.length > 0
          ? input.class_ids
          : input.class_id
            ? [input.class_id]
            : []) as string[]));

        if (classIds.length === 0) {
          throw new Error("At least one class must be selected");
        }

    const formValues = (input.form_values || {}) as Record<string, unknown>;

    const getValue = (...keys: string[]): string | null => {
      for (const key of keys) {
        const raw = key in formValues ? formValues[key] : (input as unknown as Record<string, unknown>)[key];
        if (typeof raw === "string" && raw.trim().length > 0) {
          return raw.trim();
        }
      }
      return null;
    };

    let firstName = getValue("first_name", "student_first_name");
    let lastName = getValue("last_name", "student_last_name");
    const fullName = getValue("student_name", "full_name", "nombre_completo");

    if ((!firstName || !lastName) && fullName) {
      const nameParts = fullName.split(" ").filter(Boolean);
      firstName = firstName ?? nameParts[0] ?? null;
      lastName = lastName ?? (nameParts.slice(1).join(" ") || null);
    }

    const email = getValue("email", "student_email", "correo");
    const phone = getValue("phone", "student_phone", "telefono");
    const dateOfBirth = getValue("date_of_birth", "student_birthdate", "birthdate", "fecha_nacimiento");
    const guardianName = getValue("guardian_name");
    const guardianEmail = getValue("guardian_email");
    const guardianPhone = getValue("guardian_phone");

    if (!firstName || !lastName || !email) {
      throw new Error("Missing required student fields (name/email)");
    }

    // Get tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .eq("is_active", true)
      .single();

    if (tenantError || !tenant) {
      throw new Error("Tenant not found");
    }

    // Validate classes exist and belong to tenant
    const { data: classData, error: classError } = await supabaseAdmin
      .from("classes")
      .select("id, capacity")
      .in("id", classIds)
      .eq("tenant_id", tenant.id)
      .eq("status", "active");

    if (classError || !classData || classData.length !== classIds.length) {
      throw new Error("Class not found or inactive");
    }

    const { data: confirmedEnrollments } = await supabaseAdmin
      .from("enrollments")
      .select("class_id")
      .eq("tenant_id", tenant.id)
      .eq("status", "confirmed")
      .in("class_id", classIds);

    const confirmedCountByClass = new Map<string, number>();
    (confirmedEnrollments || []).forEach((enrollment: { class_id: string }) => {
      confirmedCountByClass.set(
        enrollment.class_id,
        (confirmedCountByClass.get(enrollment.class_id) || 0) + 1
      );
    });

    const fullClasses: string[] = [];

    // Check capacity for each selected class (only confirmed enrollments consume capacity)
    for (const selectedClass of classData) {
      const enrolledCount = confirmedCountByClass.get(selectedClass.id) || 0;
      if (enrolledCount >= selectedClass.capacity) {
        fullClasses.push(selectedClass.id);
      }
    }

    if (fullClasses.length > 0) {
      const featureContext = await waitlistService.getTenantFeatureContext(tenant.id);
      if (!featureContext.waitlistEnabled) {
        throw new Error("Class is full");
      }

      const createdRequests = await Promise.all(
        fullClasses.map((classId) =>
          waitlistService.enqueuePublicRequest({
            tenantId: tenant.id,
            classId,
            contactSnapshot: {
              name: `${firstName} ${lastName}`.trim(),
              email,
              phone: phone ?? undefined,
            },
            metadata: {
              selectedClassIds: classIds,
            },
          })
        )
      );

      const createdCount = createdRequests.filter((item) => item.created).length;

      return {
        waitlistCreated: true,
        waitlistCount: createdCount,
        message: "La clase está completa. Te hemos añadido a la lista de espera.",
      };
    }

    const studentName = `${firstName} ${lastName}`.trim();
    const studentNotes = [
      input.notes ? `Notes: ${input.notes}` : null,
      input.address_line1 ? `Address: ${[input.address_line1, input.address_line2, input.city, input.state, input.postal_code, input.country].filter(Boolean).join(", ")}` : null,
      input.emergency_contact_name || input.emergency_contact_phone
        ? `Emergency: ${[input.emergency_contact_name, input.emergency_contact_phone].filter(Boolean).join(" - ")}`
        : null,
      input.medical_conditions ? `Medical: ${input.medical_conditions}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    let createdStudentId: string | null = null;

    await studentQuotaService.assertCanAddStudents(tenant.id, 1);

    const createStudent = async (emailValue: string, noteValue: string) => {
      const { data: student, error: studentError } = await supabaseAdmin
        .from("students")
        .insert({
          tenant_id: tenant.id,
          name: studentName,
          email: emailValue,
          phone: phone ?? "N/A",
          date_of_birth: dateOfBirth ?? null,
          notes: noteValue || null,
          status: "active",
          payment_type: "monthly",
        })
        .select("id")
        .single();

      return { student, studentError };
    };

    let studentId: string | null = null;
    let studentInsertEmail = email;
    let studentInsertNotes = studentNotes;

    const firstAttempt = await createStudent(studentInsertEmail, studentInsertNotes);

    if (firstAttempt.studentError || !firstAttempt.student) {
      const duplicateEmail =
        firstAttempt.studentError?.code === "23505" ||
        firstAttempt.studentError?.message?.toLowerCase().includes("email");

      if (!duplicateEmail) {
        throw new Error(`Failed to create student: ${firstAttempt.studentError?.message}`);
      }

      const atIndex = email.indexOf("@");
      const suffix = Date.now().toString().slice(-6);
      studentInsertEmail =
        atIndex > 0
          ? `${email.slice(0, atIndex)}+fam-${suffix}${email.slice(atIndex)}`
          : `${email}+fam-${suffix}`;

      studentInsertNotes = [
        studentNotes,
        `Primary contact email: ${email}`,
      ]
        .filter(Boolean)
        .join("\n");

      const retryAttempt = await createStudent(studentInsertEmail, studentInsertNotes);
      if (retryAttempt.studentError || !retryAttempt.student) {
        throw new Error(`Failed to create student: ${retryAttempt.studentError?.message}`);
      }

      studentId = retryAttempt.student.id;
    } else {
      studentId = firstAttempt.student.id;
    }

    createdStudentId = studentId;

    if (guardianName && studentId) {
      const { error: guardianError } = await supabaseAdmin.from("guardians").insert({
        tenant_id: tenant.id,
        student_id: studentId,
        name: guardianName,
        email: guardianEmail ?? null,
        phone: guardianPhone ?? null,
        relation: "guardian",
        is_primary: true,
      });

      if (guardianError) {
        if (createdStudentId) {
          await supabaseAdmin.from("students").delete().eq("id", createdStudentId);
        }
        throw new Error(`Failed to create guardian: ${guardianError.message}`);
      }
    }

    if (!studentId) {
      throw new Error("Failed to resolve student for enrollment");
    }

    const selectionMap = new Map<string, string[]>();
    for (const selection of (input.class_selections || [])) {
      const current = selectionMap.get(selection.class_id) || [];
      if (selection.schedule_id && !current.includes(selection.schedule_id)) {
        current.push(selection.schedule_id);
      }
      selectionMap.set(selection.class_id, current);
    }

    // Create one enrollment per selected class
    const enrollmentRows = classIds.map((classId) => ({
      tenant_id: tenant.id,
      student_id: studentId,
      class_id: classId,
      status: "pending",
      student_snapshot: {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        guardian_name: guardianName,
        guardian_email: guardianEmail,
        guardian_phone: guardianPhone,
        selected_schedule_ids: selectionMap.get(classId) || [],
        form_values: formValues,
      },
      notes: input.notes ?? null,
    }));

    const { data: enrollments, error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .insert(enrollmentRows)
      .select("id");

    if (enrollmentError || !enrollments || enrollments.length === 0) {
      if (createdStudentId) {
        await supabaseAdmin.from("students").delete().eq("id", createdStudentId);
      }
      throw new Error(`Failed to create enrollment: ${enrollmentError?.message}`);
    }

    return {
      enrollmentId: enrollments[0].id,
      studentId,
    };
  },

   /**
     * Create a joint/family enrollment with multiple students
     */
    async createJointEnrollment(
      tenantSlug: string,
      input: JointEnrollmentInput
    ): Promise<{ enrollmentIds: string[]; studentIds: string[]; groupId: string }> {
     // Get tenant by slug
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .select("id, name")
        .eq("slug", tenantSlug)
        .eq("is_active", true)
        .single();

      if (tenantError || !tenant) {
        throw new Error("Tenant not found");
      }

      // Collect all class IDs from all students
      const allClassIds = input.students.flatMap(s => s.class_ids);
      const uniqueClassIds = [...new Set(allClassIds)];

      // Validate classes exist and belong to tenant
      const { data: classData, error: classError } = await supabaseAdmin
        .from("classes")
        .select("id, capacity")
        .in("id", uniqueClassIds)
        .eq("tenant_id", tenant.id)
        .eq("status", "active");

      if (classError || !classData || classData.length !== uniqueClassIds.length) {
        throw new Error("One or more classes not found or inactive");
      }

      const { data: confirmedEnrollments } = await supabaseAdmin
        .from("enrollments")
        .select("class_id")
        .eq("tenant_id", tenant.id)
        .eq("status", "confirmed")
        .in("class_id", uniqueClassIds);

      const confirmedCountByClass = new Map<string, number>();
      (confirmedEnrollments || []).forEach((enrollment: { class_id: string }) => {
        confirmedCountByClass.set(
          enrollment.class_id,
          (confirmedCountByClass.get(enrollment.class_id) || 0) + 1
        );
      });

      // Check capacity for each class (only confirmed enrollments consume capacity)
      for (const selectedClass of classData) {
        const enrolledCount = confirmedCountByClass.get(selectedClass.id) || 0;
        const requestedCount = allClassIds.filter(id => id === selectedClass.id).length;
      
        if (enrolledCount + requestedCount > selectedClass.capacity) {
          throw new Error(`Class is full or doesn't have enough capacity`);
        }
      }

      // Generate a group ID for this joint enrollment
      const { data: groupIdData } = await supabaseAdmin.rpc('gen_random_uuid');
      const groupId = groupIdData || crypto.randomUUID();

      const studentIds: string[] = [];
      const enrollmentIds: string[] = [];
      let createdStudentIds: string[] = [];

      try {
        // Create each student and their enrollments
        for (const studentData of input.students) {
          const firstName = (studentData.first_name as string) || "";
          const lastName = (studentData.last_name as string) || "";
          const email = (studentData.email as string) || input.payer_info.email;
          const phone = (studentData.phone as string) || input.payer_info.phone;
          const dateOfBirth = (studentData.date_of_birth as string) || null;
          const formValues = studentData.form_values || {};

          const studentName = `${firstName} ${lastName}`.trim();
          const studentNotes = [
            studentData.notes ? `Notes: ${studentData.notes}` : null,
            `Payer: ${input.payer_info.name}`,
            `Payer Email: ${input.payer_info.email}`,
            `Payer Phone: ${input.payer_info.phone}`,
            studentData.address_line1 ? `Address: ${[studentData.address_line1, studentData.address_line2, studentData.city, studentData.state, studentData.postal_code, studentData.country].filter(Boolean).join(", ")}` : null,
            studentData.emergency_contact_name || studentData.emergency_contact_phone
              ? `Emergency: ${[studentData.emergency_contact_name, studentData.emergency_contact_phone].filter(Boolean).join(" - ")}`
              : null,
            studentData.medical_conditions ? `Medical: ${studentData.medical_conditions}` : null,
          ]
            .filter(Boolean)
            .join("\n");

          const selectionMap = new Map<string, string[]>();
          for (const selection of (studentData.class_selections || [])) {
            const current = selectionMap.get(selection.class_id) || [];
            if (selection.schedule_id && !current.includes(selection.schedule_id)) {
              current.push(selection.schedule_id);
            }
            selectionMap.set(selection.class_id, current);
          }

          // Create student with email deduplication handling (or reuse existing student)
          let studentInsertEmail = email;
          let finalNotes = studentNotes;

          const createStudent = async (emailValue: string, noteValue: string) => {
            const { data: student, error: studentError } = await supabaseAdmin
              .from("students")
              .insert({
                tenant_id: tenant.id,
                name: studentName,
                email: emailValue,
                phone: phone ?? "N/A",
                date_of_birth: dateOfBirth,
                notes: noteValue || null,
                status: "active",
                payment_type: "monthly",
              })
              .select("id")
              .single();

            return { student, studentError };
          };

          let studentId: string | null = null;
          let studentWasCreated = false;

          const targetName = normalizeName(studentName);
          const targetEmail = normalizeEmail(email);
          const targetPhone = normalizePhone(phone);
          const targetBirthdate = String(dateOfBirth || "").trim();

          const identityFilters: string[] = [];
          if (targetEmail) identityFilters.push(`email.eq.${targetEmail}`);
          if (targetPhone) identityFilters.push(`phone.eq.${phone}`);
          if (targetBirthdate) identityFilters.push(`date_of_birth.eq.${targetBirthdate}`);

          const candidateQuery = supabaseAdmin
            .from("students")
            .select("id, name, email, phone, date_of_birth")
            .eq("tenant_id", tenant.id)
            .limit(50);

          const { data: existingCandidates } = identityFilters.length > 0
            ? await candidateQuery.or(identityFilters.join(","))
            : { data: [] as Array<{ id: string; name: string; email: string | null; phone: string | null; date_of_birth: string | null }> };

          const scoredCandidates = (existingCandidates || [])
            .map((candidate) => {
              const nameMatches = normalizeName(candidate.name) === targetName;
              const emailMatches = targetEmail.length > 0 && normalizeEmail(candidate.email) === targetEmail;
              const phoneMatches = targetPhone.length > 0 && normalizePhone(candidate.phone) === targetPhone;
              const birthdateMatches = targetBirthdate.length > 0 && String(candidate.date_of_birth || "").trim() === targetBirthdate;

              let score = 0;
              if (nameMatches) score += 3;
              if (birthdateMatches) score += 3;
              if (phoneMatches) score += 2;
              if (emailMatches) score += 2;

              return {
                candidate,
                score,
                nameMatches,
                birthdateMatches,
                phoneMatches,
                emailMatches,
              };
            })
            .filter((item) => item.nameMatches && (item.birthdateMatches || item.phoneMatches || item.emailMatches))
            .sort((a, b) => b.score - a.score);

          const reuseStudent = scoredCandidates[0]?.candidate;

          if (reuseStudent?.id) {
            studentId = reuseStudent.id;
          } else {
            await studentQuotaService.assertCanAddStudents(tenant.id, 1);
            const firstAttempt = await createStudent(studentInsertEmail, finalNotes);

            if (firstAttempt.studentError) {
            const duplicateEmail =
              firstAttempt.studentError?.code === "23505" ||
              firstAttempt.studentError?.message?.toLowerCase().includes("email");

              if (!duplicateEmail) {
                throw new Error(`Failed to create student: ${firstAttempt.studentError?.message}`);
              }

              // Generate unique email
              const atIndex = email.indexOf("@");
              const suffix = Date.now().toString().slice(-6) + Math.random().toString(36).slice(-4);
              studentInsertEmail =
                atIndex > 0
                  ? `${email.slice(0, atIndex)}+joint-${suffix}${email.slice(atIndex)}`
                  : `${email}+joint-${suffix}`;

              finalNotes = [
                studentNotes,
                `Original contact email: ${email}`,
              ]
                .filter(Boolean)
                .join("\n");

              const retryAttempt = await createStudent(studentInsertEmail, finalNotes);
              if (retryAttempt.studentError || !retryAttempt.student) {
                throw new Error(`Failed to create student after retry: ${retryAttempt.studentError?.message}`);
              }

              studentId = retryAttempt.student.id;
            } else {
              studentId = firstAttempt.student!.id;
            }

            studentWasCreated = true;
          }

          if (!studentId) {
            throw new Error("Failed to resolve student for joint enrollment");
          }

          if (studentWasCreated) {
            createdStudentIds.push(studentId);
          }
          studentIds.push(studentId);

          // Ensure at least one primary guardian exists for the student
          const { data: currentPrimaryGuardian } = await supabaseAdmin
            .from("guardians")
            .select("id")
            .eq("tenant_id", tenant.id)
            .eq("student_id", studentId)
            .eq("is_primary", true)
            .maybeSingle();

          if (!currentPrimaryGuardian) {
            const { error: guardianError } = await supabaseAdmin.from("guardians").insert({
              tenant_id: tenant.id,
              student_id: studentId,
              name: input.payer_info.name,
              email: input.payer_info.email,
              phone: input.payer_info.phone,
              relation: "guardian",
              is_primary: true,
            });

            if (guardianError) {
              throw new Error(`Failed to create guardian: ${guardianError.message}`);
            }
          }

          const { data: activeEnrollments } = await supabaseAdmin
            .from("enrollments")
            .select("id, class_id")
            .eq("tenant_id", tenant.id)
            .eq("student_id", studentId)
            .in("status", ["pending", "confirmed"])
            .in("class_id", studentData.class_ids);

          const activeByClass = new Map((activeEnrollments || []).map((row) => [row.class_id, row]));

          // Align existing active enrollments to current joint group context.
          for (const classId of studentData.class_ids) {
            const existingEnrollment = activeByClass.get(classId);
            if (!existingEnrollment) continue;

            const { error: updateExistingError } = await supabaseAdmin
              .from("enrollments")
              .update({
                joint_enrollment_group_id: groupId,
                student_snapshot: {
                  first_name: firstName,
                  last_name: lastName,
                  email,
                  phone,
                  guardian_name: input.payer_info.name,
                  guardian_email: input.payer_info.email,
                  guardian_phone: input.payer_info.phone,
                  selected_schedule_ids: selectionMap.get(classId) || [],
                  form_values: formValues,
                  is_joint_enrollment: true,
                  linked_existing_student: true,
                },
                notes: studentData.notes ?? null,
              })
              .eq("id", existingEnrollment.id)
              .eq("tenant_id", tenant.id);

            if (updateExistingError) {
              throw new Error(`Failed to update existing enrollment: ${updateExistingError.message}`);
            }

            enrollmentIds.push(existingEnrollment.id);
          }

          // Create missing enrollments for this student
          const classIdsToCreate = studentData.class_ids.filter((classId) => !activeByClass.has(classId));
          const enrollmentRows = classIdsToCreate.map((classId) => ({
            tenant_id: tenant.id,
            student_id: studentId,
            class_id: classId,
            status: "pending" as const,
            joint_enrollment_group_id: groupId,
            student_snapshot: {
              first_name: firstName,
              last_name: lastName,
              email,
              phone,
              guardian_name: input.payer_info.name,
              guardian_email: input.payer_info.email,
              guardian_phone: input.payer_info.phone,
              selected_schedule_ids: selectionMap.get(classId) || [],
              form_values: formValues,
              is_joint_enrollment: true,
            },
            notes: studentData.notes ?? null,
          }));

          if (enrollmentRows.length > 0) {
            const { data: enrollments, error: enrollmentError } = await supabaseAdmin
              .from("enrollments")
              .insert(enrollmentRows)
              .select("id");

            if (enrollmentError || !enrollments || enrollments.length === 0) {
              throw new Error(`Failed to create enrollments: ${enrollmentError?.message}`);
            }

            enrollmentIds.push(...enrollments.map(e => e.id));
          }
        }

        return {
          enrollmentIds,
          studentIds,
          groupId,
        };
      } catch (error) {
        // Rollback: delete created students
        if (createdStudentIds.length > 0) {
          await supabaseAdmin
            .from("students")
            .delete()
            .in("id", createdStudentIds);
        }
        throw error;
      }
    },
};
