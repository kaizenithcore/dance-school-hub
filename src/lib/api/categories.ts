import { apiRequest } from "./client";

interface CategoryApiModel {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

function mapCategoryFromApi(c: CategoryApiModel): Category {
  return {
    id: c.id,
    tenantId: c.tenant_id,
    name: c.name,
    description: c.description ?? "",
    isActive: c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function mapCategoryToApi(c: CreateCategoryRequest | UpdateCategoryRequest) {
  return {
    ...(c.name !== undefined ? { name: c.name } : {}),
    ...(c.description !== undefined ? { description: c.description } : {}),
    ...(c.isActive !== undefined ? { isActive: c.isActive } : {}),
  };
}

export async function getCategories(): Promise<Category[]> {
  const response = await apiRequest<CategoryApiModel[]>("/api/admin/categories");
  return response.success ? (response.data || []).map(mapCategoryFromApi) : [];
}

export async function createCategory(data: CreateCategoryRequest): Promise<Category | null> {
  const response = await apiRequest<CategoryApiModel>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(mapCategoryToApi(data)),
  });
  return response.success && response.data ? mapCategoryFromApi(response.data) : null;
}

export async function updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category | null> {
  const response = await apiRequest<CategoryApiModel>(`/api/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(mapCategoryToApi(data)),
  });
  return response.success && response.data ? mapCategoryFromApi(response.data) : null;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const response = await apiRequest(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
  return response.success || false;
}
