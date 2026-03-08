import { apiRequest } from "./client";

interface ClassApiModel {
  id: string;
  tenant_id: string;
  name: string;
  discipline_id?: string | null;
  category_id?: string | null;
  discipline?: string;
  category?: string | null;
  description: string | null;
  teacher_id: string | null;
  room_id: string | null;
  capacity: number;
  weekly_frequency?: number;
  price_cents: number;
  status: "active" | "inactive" | "draft";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassWithRelations {
  id: string;
  tenantId: string;
  name: string;
  discipline: string;
  category: string | null;
  description: string | null;
  teacherId: string | null;
  roomId: string | null;
  capacity: number;
  weeklyFrequency: number;
  price: number;
  status: "active" | "inactive" | "draft";
  createdAt: string;
  updatedAt: string;
  teacher?: { id: string; name: string } | null;
}

export interface CreateClassRequest {
  name: string;
  discipline_id?: string;
  category_id?: string;
  description?: string;
  teacher_id?: string;
  room_id?: string;
  capacity: number;
  weeklyFrequency?: number;
  price: number;
  status?: "active" | "inactive" | "draft";
}

export interface UpdateClassRequest {
  name?: string;
  discipline_id?: string;
  category_id?: string;
  description?: string;
  teacher_id?: string;
  room_id?: string;
  capacity?: number;
  weeklyFrequency?: number;
  price?: number;
  status?: "active" | "inactive" | "draft";
}

function mapClassFromApi(item: ClassApiModel): ClassWithRelations {
  return {
    id: item.id,
    tenantId: item.tenant_id,
    name: item.name,
    discipline: item.discipline_id || item.discipline || "",
    category: item.category_id || item.category || "",
    description: item.description,
    teacherId: item.teacher_id,
    roomId: item.room_id,
    capacity: item.capacity,
    weeklyFrequency: item.weekly_frequency ?? 1,
    price: Math.round(item.price_cents / 100),
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    teacher: null,
  };
}

function mapClassCreateToApi(data: CreateClassRequest) {
  return {
    name: data.name,
    discipline_id: data.discipline_id ?? null,
    category_id: data.category_id ?? null,
    description: data.description ?? null,
    teacher_id: data.teacher_id ?? null,
    room_id: data.room_id ?? null,
    capacity: data.capacity,
    weekly_frequency: data.weeklyFrequency ?? 1,
    price_cents: Math.round(data.price * 100),
    status: data.status ?? "active",
  };
}

function mapClassUpdateToApi(data: UpdateClassRequest) {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.discipline_id !== undefined ? { discipline_id: data.discipline_id } : {}),
    ...(data.category_id !== undefined ? { category_id: data.category_id } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.teacher_id !== undefined ? { teacher_id: data.teacher_id } : {}),
    ...(data.room_id !== undefined ? { room_id: data.room_id } : {}),
    ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
    ...(data.weeklyFrequency !== undefined ? { weekly_frequency: data.weeklyFrequency } : {}),
    ...(data.price !== undefined ? { price_cents: Math.round(data.price * 100) } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
  };
}

export async function getClasses(): Promise<ClassWithRelations[]> {
  const response = await apiRequest<ClassApiModel[]>("/api/admin/classes");
  return response.success ? (response.data || []).map(mapClassFromApi) : [];
}

export async function getClass(id: string): Promise<ClassWithRelations | null> {
  const response = await apiRequest<ClassApiModel>(`/api/admin/classes/${id}`);
  return response.success && response.data ? mapClassFromApi(response.data) : null;
}

export async function createClass(data: CreateClassRequest): Promise<ClassWithRelations | null> {
  const response = await apiRequest<ClassApiModel>("/api/admin/classes", {
    method: "POST",
    body: JSON.stringify(mapClassCreateToApi(data)),
  });
  return response.success && response.data ? mapClassFromApi(response.data) : null;
}

export async function updateClass(id: string, data: UpdateClassRequest): Promise<ClassWithRelations | null> {
  const response = await apiRequest<ClassApiModel>(`/api/admin/classes/${id}`, {
    method: "PUT",
    body: JSON.stringify(mapClassUpdateToApi(data)),
  });
  return response.success && response.data ? mapClassFromApi(response.data) : null;
}

export async function deleteClass(id: string): Promise<boolean> {
  const response = await apiRequest(`/api/admin/classes/${id}`, {
    method: "DELETE",
  });
  return response.success || false;
}

// Legacy interface for compatibility
export interface DanceClass {
  id: string;
  name: string;
  teacher: string;
  discipline: string;
  category: string;
  price: number;
  capacity: number;
  status: "active" | "inactive" | "draft";
}
