import { apiRequest } from "./client";

export interface Teacher {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  salay: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface CreateTeacherRequest {
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  status?: "active" | "inactive";
  salay?: number;
  aulary?: number;
}

export interface UpdateTeacherRequest {
  name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  status?: "active" | "inactive";
  salay?: number;
  aulary?: number;
}

function normalizeTeacher(row: any): Teacher {
  return {
    ...row,
    salay: Number(row?.salay ?? row?.aulary ?? 0),
  } as Teacher;
}

export async function getTeachers(): Promise<Teacher[]> {
  const response = await apiRequest<Teacher[]>("/api/admin/teachers");
  return response.success ? (response.data || []).map((row) => normalizeTeacher(row)) : [];
}

export async function getTeacher(id: string): Promise<Teacher | null> {
  const response = await apiRequest<Teacher>(`/api/admin/teachers/${id}`);
  return response.success && response.data ? normalizeTeacher(response.data) : null;
}

export async function createTeacher(data: CreateTeacherRequest): Promise<Teacher | null> {
  const payload = {
    ...data,
    salay: data.salay ?? data.aulary,
  };
  const response = await apiRequest<Teacher>("/api/admin/teachers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.success && response.data ? normalizeTeacher(response.data) : null;
}

export async function updateTeacher(id: string, data: UpdateTeacherRequest): Promise<Teacher | null> {
  const payload = {
    ...data,
    salay: data.salay ?? data.aulary,
  };
  const response = await apiRequest<Teacher>(`/api/admin/teachers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.success && response.data ? normalizeTeacher(response.data) : null;
}

export async function deleteTeacher(id: string): Promise<boolean> {
  const response = await apiRequest<{ deleted: boolean }>(`/api/admin/teachers/${id}`, {
    method: "DELETE",
  });
  return response.success;
}
