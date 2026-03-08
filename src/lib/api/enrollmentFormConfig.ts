import { apiRequest } from "@/lib/api/client";
import type { EnrollmentFormConfig } from "@/lib/types/formBuilder";

interface EnrollmentFormConfigResponse {
  config: EnrollmentFormConfig;
}

export async function getEnrollmentFormConfig() {
  return apiRequest<EnrollmentFormConfigResponse>("/api/admin/enrollment-form");
}

export async function saveEnrollmentFormConfig(config: EnrollmentFormConfig) {
  return apiRequest<EnrollmentFormConfigResponse>("/api/admin/enrollment-form", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
}
