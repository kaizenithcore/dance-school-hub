const API_URL = import.meta.env.VITE_API_URL;

function buildApiBaseCandidates(): string[] {
  const candidates = new Set<string>();

  if (typeof API_URL === "string" && API_URL.trim().length > 0) {
    candidates.add(API_URL.trim().replace(/\/$/, ""));
  }

  // Local default backend URL for split frontend/backend dev setup.
  candidates.add("http://localhost:3000");

  // Same-origin fallback for environments behind reverse proxy.
  if (typeof window !== "undefined" && window.location?.origin) {
    candidates.add(window.location.origin.replace(/\/$/, ""));
  }

  return Array.from(candidates);
}

function buildEndpointCandidates(path: string): string[] {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return buildApiBaseCandidates().map((base) => `${base}${normalizedPath}`);
}

async function fetchJsonFromCandidates<T>(path: string, init?: RequestInit): Promise<T | null> {
  const endpoints = buildEndpointCandidates(path);
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, init);
      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        continue;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Network request failed");
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPublicFormData(value: unknown): value is PublicFormData {
  if (!isObject(value)) return false;

  const tenantId = value.tenantId;
  const tenantName = value.tenantName;
  const formConfig = value.formConfig;
  const availableClasses = value.availableClasses;

  return (
    typeof tenantId === "string" &&
    typeof tenantName === "string" &&
    isObject(formConfig) &&
    Array.isArray(availableClasses)
  );
}

function extractPublicFormData(payload: unknown): PublicFormData | null {
  // Backward-compatible support for both wrapped and direct payloads.
  if (isPublicFormData(payload)) {
    return payload;
  }

  if (!isObject(payload)) {
    return null;
  }

  const success = payload.success;
  const data = payload.data;

  if (success === true && isPublicFormData(data)) {
    return data;
  }

  return null;
}

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
    const endpoints = buildEndpointCandidates(`/api/public/form/${tenantSlug}`);
    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          continue;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
          continue;
        }

        const payload = (await response.json()) as unknown;
        const data = extractPublicFormData(payload);
        if (data) {
          return data;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Network request failed");
      }
    }

    if (lastError) {
      throw lastError;
    }

    return null;
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
    const requestBody = JSON.stringify({
      tenantSlug,
      ...payload,
    });

    const endpoints = buildEndpointCandidates("/api/public/enroll");
    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: requestBody,
        });

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
          continue;
        }

        const data = await response.json();
        if (!response.ok) {
          lastError = new Error(data?.error?.message || "Failed to submit enrollment");
          continue;
        }

        return data.data as EnrollmentResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Failed to submit enrollment");
      }
    }

    throw lastError || new Error("No se pudo conectar con el backend publico");
  } catch (error) {
    console.error("Error submitting enrollment:", error);
    throw error;
  }
}
