import { apiRequest } from "./client";

interface DisciplineApiModel {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Discipline {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisciplineRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDisciplineRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

function mapDisciplineFromApi(d: DisciplineApiModel): Discipline {
  return {
    id: d.id,
    tenantId: d.tenant_id,
    name: d.name,
    description: d.description ?? "",
    isActive: d.is_active,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function mapDisciplineToApi(d: CreateDisciplineRequest | UpdateDisciplineRequest) {
  return {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.description !== undefined ? { description: d.description } : {}),
    ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
  };
}

export async function getDisciplines(): Promise<Discipline[]> {
  const response = await apiRequest<DisciplineApiModel[]>("/api/admin/disciplines");
  return response.success ? (response.data || []).map(mapDisciplineFromApi) : [];
}

export async function createDiscipline(data: CreateDisciplineRequest): Promise<Discipline | null> {
  const response = await apiRequest<DisciplineApiModel>("/api/admin/disciplines", {
    method: "POST",
    body: JSON.stringify(mapDisciplineToApi(data)),
  });
  return response.success && response.data ? mapDisciplineFromApi(response.data) : null;
}

export async function updateDiscipline(id: string, data: UpdateDisciplineRequest): Promise<Discipline | null> {
  const response = await apiRequest<DisciplineApiModel>(`/api/admin/disciplines/${id}`, {
    method: "PUT",
    body: JSON.stringify(mapDisciplineToApi(data)),
  });
  return response.success && response.data ? mapDisciplineFromApi(response.data) : null;
}

export async function deleteDiscipline(id: string): Promise<boolean> {
  const response = await apiRequest(`/api/admin/disciplines/${id}`, {
    method: "DELETE",
  });
  return response.success || false;
}
