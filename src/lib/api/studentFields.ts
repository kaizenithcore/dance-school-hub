import { apiRequest } from "./client";

export type StudentFieldType = "text" | "number" | "date" | "select";

export interface SchoolStudentField {
  id: string;
  schoolId: string;
  key: string;
  label: string;
  type: StudentFieldType;
  required: boolean;
  visible: boolean;
  visibleInTable: boolean;
  createdAt: string;
}

export interface SaveStudentFieldRequest {
  key: string;
  label: string;
  type: StudentFieldType;
  required?: boolean;
  visible?: boolean;
  visibleInTable?: boolean;
}

export async function getStudentFields(): Promise<SchoolStudentField[]> {
  const response = await apiRequest<SchoolStudentField[]>("/api/schools/student-fields");
  return response.success ? (response.data || []) : [];
}

export async function createStudentField(payload: SaveStudentFieldRequest): Promise<SchoolStudentField> {
  const response = await apiRequest<SchoolStudentField>("/api/schools/student-fields", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear el campo");
  }

  return response.data;
}

export async function updateStudentField(id: string, payload: Partial<SaveStudentFieldRequest>): Promise<SchoolStudentField> {
  const response = await apiRequest<SchoolStudentField>(`/api/schools/student-fields/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar el campo");
  }

  return response.data;
}

export async function deleteStudentField(id: string): Promise<boolean> {
  const response = await apiRequest<{ deleted: boolean }>(`/api/schools/student-fields/${id}`, {
    method: "DELETE",
  });

  return response.success;
}
