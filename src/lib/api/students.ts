import { apiRequest } from "./client";
import type { StudentRecord } from "@/lib/data/mockStudents";

export interface SaveStudentRequest {
  name: string;
  email: string;
  phone: string;
  address?: string;
  locality?: string;
  identityDocumentType?: "dni" | "passport";
  identityDocumentNumber?: string;
  birthdate?: string;
  status: "active" | "inactive";
  joinDate?: string;
  guardian?: { name: string; phone: string; email?: string };
  notes?: string;
  paymentType: "monthly" | "per_class" | "none";
  payerType?: "student" | "guardian" | "other";
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  preferredPaymentMethod?: "transfer" | "cash" | "card" | "mercadopago";
  accountNumber?: string;
  classIds?: string[];
  jointEnrollmentGroupId?: string | null;
  extraData?: Record<string, unknown>;
}

export interface JointGroupMember {
  id: string;
  name: string;
  email: string;
}

interface CreateStudentResponse {
  id: string;
}

function mapStudentFromApi(student: StudentRecord): StudentRecord {
  return {
    ...student,
    enrolledClasses: student.enrolledClasses || [],
    notes: student.notes || "",
    birthdate: student.birthdate || "",
    joinDate: student.joinDate || new Date().toISOString().slice(0, 10),
    extraData: student.extraData && typeof student.extraData === "object" ? student.extraData : {},
  };
}

export async function getStudents(): Promise<StudentRecord[]> {
  const response = await apiRequest<StudentRecord[]>("/api/admin/students");
  if (!response.success) return [];
  return (response.data || []).map(mapStudentFromApi);
}

export async function createStudent(data: SaveStudentRequest): Promise<string | null> {
  const response = await apiRequest<CreateStudentResponse>("/api/admin/students", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo crear el alumno");
  }

  return response.success && response.data ? response.data.id : null;
}

export async function updateStudent(id: string, data: Partial<SaveStudentRequest>): Promise<boolean> {
  const response = await apiRequest<{ id: string; updated: boolean }>(`/api/admin/students/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo actualizar el alumno");
  }

  return true;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const response = await apiRequest<{ id: string; deleted: boolean }>(`/api/admin/students/${id}`, {
    method: "DELETE",
  });

  return response.success;
}

export async function updateStudentClasses(
  id: string,
  payload: {
    classIds: string[];
    jointEnrollmentGroupId?: string | null;
    selections?: Array<{ classId: string; scheduleIds?: string[] }>;
  }
): Promise<boolean> {
  const response = await apiRequest<{ id: string; updated: boolean }>(`/api/admin/students/${id}/classes`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return response.success;
}

export async function getJointGroupMembers(groupId: string): Promise<JointGroupMember[]> {
  const response = await apiRequest<JointGroupMember[]>(`/api/admin/students/joint-groups/${groupId}/members`);
  if (!response.success) return [];
  return response.data || [];
}

export async function addMemberToJointGroup(groupId: string, studentId: string): Promise<boolean> {
  const response = await apiRequest<{ added: boolean }>(`/api/admin/students/joint-groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ studentId }),
  });

  return response.success;
}

export async function removeMemberFromJointGroup(groupId: string, studentId: string): Promise<boolean> {
  const response = await apiRequest<{ removed: boolean }>(
    `/api/admin/students/joint-groups/${groupId}/members/${studentId}`,
    {
      method: "DELETE",
    }
  );

  return response.success;
}
