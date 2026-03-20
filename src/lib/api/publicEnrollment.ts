const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type FieldType = "text" | "email" | "tel" | "textarea" | "select" | "checkbox" | "file" | "date" | "number" | "info";

export interface FieldCondition {
  id: string;
  sourceFieldId: string;
  operator: "equals" | "not_equals" | "less_than" | "greater_than" | "contains" | "is_empty" | "is_not_empty" | "date_before" | "date_after";
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  accept?: string;
  maxLength?: number;
  conditions?: FieldCondition[];
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  conditions?: FieldCondition[];
}

export interface ScheduleDisplaySettings {
  preferredView: "calendar" | "list";
  recurringSelectionMode: "linked" | "single_day";
  recurringClassOverrides: string[];
  calendarFields: {
    showDiscipline: boolean;
    showCategory: boolean;
    showRoom: boolean;
    showCapacity: boolean;
    showPrice: boolean;
    showSelectedStudents: boolean;
  };
}

export interface EnrollmentFormConfig {
  sections: FormSection[];
  jointEnrollment: {
    enabled: boolean;
    maxStudents: number;
    /** @deprecated Use scheduleSettings instead */
    schedule?: ScheduleDisplaySettings;
  };
  includeSchedule: boolean;
  includePricing: boolean;
  scheduleSettings?: ScheduleDisplaySettings;
}

export interface ClassSchedule {
  id: string;
  day: string;
  startHour: number;
  duration: number;
  room: string;
  branchName?: string;
  branchSlug?: string;
}

export interface PublicClass {
  id: string;
  name: string;
  discipline: string;
  category: string;
  min_age?: number | null;
  max_age?: number | null;
  price_cents: number;
  capacity: number;
  enrolled_count: number;
  schedules?: ClassSchedule[];
}

export interface PublicSchoolProfile {
  tagline?: string;
  description?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface PublicBranchProfile {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  isPrimary: boolean;
  address?: string;
  city?: string;
}

export interface PublicScheduleConfig {
  startHour?: string;
  endHour?: string;
  recurringSelectionMode?: "linked" | "single_day";
}

export interface PublicFormData {
  tenantId: string;
  tenantName: string;
  branches?: PublicBranchProfile[];
  formConfig: EnrollmentFormConfig;
  demo?: {
    isDemo: boolean;
    readonly: boolean;
    highlightedModules: readonly string[];
    cta: {
      title: string;
      description: string;
    };
  };
  publicProfile?: PublicSchoolProfile;
  scheduleConfig?: PublicScheduleConfig;
  availableClasses: PublicClass[];
}

export interface EnrollmentSubmitPayload {
  class_id?: string;
  class_ids?: string[];
    class_selections?: Array<{
      class_id: string;
      schedule_id?: string;
    }>;
    form_values: Record<string, unknown>;
    students?: Array<{
      form_values: Record<string, unknown>;
      class_ids: string[];
    }>;
    is_joint_enrollment?: boolean;
    payer_info?: {
      name: string;
      email: string;
      phone: string;
    };
}

export interface EnrollmentResponse {
  success: boolean;
  enrollmentId?: string;
  studentId?: string;
  waitlistCreated?: boolean;
  waitlistCount?: number;
  message: string;
}

export async function getPublicFormData(tenantSlug: string): Promise<PublicFormData | null> {
  try {
    const response = await fetch(`${API_URL}/api/public/form/${tenantSlug}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching public form data:", error);
    return null;
  }
}

export async function submitPublicEnrollment(
  tenantSlug: string,
  payload: EnrollmentSubmitPayload
): Promise<EnrollmentResponse | null> {
  try {
    const response = await fetch(`${API_URL}/api/public/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug,
        ...payload,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to submit enrollment");
    }
    
    return data.data;
  } catch (error) {
    console.error("Error submitting enrollment:", error);
    throw error;
  }
}
