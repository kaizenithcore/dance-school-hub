import { apiRequest } from "./client";
import type { EnrollmentRecord, EnrollmentStatus } from "@/lib/data/mockEnrollments";

interface EnrollmentStatusUpdateResponse {
  id: string;
  status: EnrollmentStatus;
  unchanged: boolean;
}

export async function getEnrollments(): Promise<EnrollmentRecord[]> {
  const response = await apiRequest<EnrollmentRecord[]>("/api/admin/enrollments");
  if (!response.success) return [];
  return response.data || [];
}

export async function updateEnrollmentStatus(
  id: string,
  status: EnrollmentStatus
): Promise<EnrollmentStatusUpdateResponse | null> {
  const response = await apiRequest<EnrollmentStatusUpdateResponse>(`/api/admin/enrollments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  return response.success ? response.data || null : null;
}
