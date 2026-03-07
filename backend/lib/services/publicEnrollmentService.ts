import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { PublicEnrollmentInput } from "@/lib/validators/publicEnrollmentSchemas";

export interface PublicFormData {
  tenantName: string;
  availableClasses: Array<{
    id: string;
    name: string;
    discipline: string;
    category: string;
    price_cents: number;
    capacity: number;
    enrolled_count: number;
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

    // Get active classes with enrollment count
    const { data: classes, error: classesError } = await supabaseAdmin
      .from("classes")
      .select(`
        id,
        name,
        discipline_id,
        category_id,
        price_cents,
        capacity,
        enrollments!enrollments_class_id_fkey(id)
      `)
      .eq("tenant_id", tenant.id)
      .eq("status", "active");

    if (classesError) {
      console.error("Error fetching classes:", classesError);
      return {
        tenantName: tenant.name,
        availableClasses: [],
      };
    }

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

    const availableClasses = (classes || []).map((cls: any) => ({
      id: cls.id,
      name: cls.name,
      discipline: disciplineMap.get(cls.discipline_id) || "General",
      category: categoryMap.get(cls.category_id) || "General",
      price_cents: cls.price_cents,
      capacity: cls.capacity,
      enrolled_count: cls.enrollments?.length || 0,
    }));

    return {
      tenantName: tenant.name,
      availableClasses,
    };
  },

  /**
   * Create a new public enrollment
   */
  async createEnrollment(
    tenantSlug: string,
    input: PublicEnrollmentInput
  ): Promise<{ enrollmentId: string; studentId: string }> {
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

    // Validate class exists and belongs to tenant
    const { data: classData, error: classError } = await supabaseAdmin
      .from("classes")
      .select("id, capacity, enrollments!enrollments_class_id_fkey(id)")
      .eq("id", input.class_id)
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .single();

    if (classError || !classData) {
      throw new Error("Class not found or inactive");
    }

    // Check capacity
    const enrolledCount = (classData.enrollments as any[])?.length || 0;
    if (enrolledCount >= classData.capacity) {
      throw new Error("Class is full");
    }

    const studentName = `${input.first_name} ${input.last_name}`.trim();
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

    // Create student
    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .insert({
        tenant_id: tenant.id,
        name: studentName,
        email: input.email,
        phone: input.phone ?? "N/A",
        date_of_birth: input.date_of_birth ?? null,
        notes: studentNotes || null,
        status: "active",
        payment_type: "monthly",
      })
      .select()
      .single();

    if (studentError || !student) {
      throw new Error(`Failed to create student: ${studentError?.message}`);
    }

    if (input.guardian_name) {
      const { error: guardianError } = await supabaseAdmin.from("guardians").insert({
        tenant_id: tenant.id,
        student_id: student.id,
        name: input.guardian_name,
        email: input.guardian_email ?? null,
        phone: input.guardian_phone ?? null,
        relation: "guardian",
        is_primary: true,
      });

      if (guardianError) {
        await supabaseAdmin.from("students").delete().eq("id", student.id);
        throw new Error(`Failed to create guardian: ${guardianError.message}`);
      }
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .insert({
        tenant_id: tenant.id,
        student_id: student.id,
        class_id: input.class_id,
        status: "pending",
        student_snapshot: {
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          phone: input.phone,
          guardian_name: input.guardian_name,
          guardian_email: input.guardian_email,
          guardian_phone: input.guardian_phone,
        },
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (enrollmentError || !enrollment) {
      // Rollback: delete student
      await supabaseAdmin.from("students").delete().eq("id", student.id);
      throw new Error(`Failed to create enrollment: ${enrollmentError?.message}`);
    }

    return {
      enrollmentId: enrollment.id,
      studentId: student.id,
    };
  },
};
