import { apiRequest } from "./client";

interface RoomApiModel {
  id: string;
  tenant_id: string;
  name: string;
  capacity: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  tenantId: string;
  name: string;
  capacity: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomRequest {
  name: string;
  capacity: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRoomRequest {
  name?: string;
  capacity?: number;
  description?: string;
  isActive?: boolean;
}

function mapRoomFromApi(room: RoomApiModel): Room {
  return {
    id: room.id,
    tenantId: room.tenant_id,
    name: room.name,
    capacity: room.capacity,
    description: room.description ?? "",
    isActive: room.is_active,
    createdAt: room.created_at,
    updatedAt: room.updated_at,
  };
}

function mapRoomCreateToApi(data: CreateRoomRequest) {
  return {
    name: data.name,
    capacity: data.capacity,
    description: data.description ?? null,
    is_active: data.isActive ?? true,
  };
}

function mapRoomUpdateToApi(data: UpdateRoomRequest) {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
  };
}

export async function getRooms(): Promise<Room[]> {
  const response = await apiRequest<RoomApiModel[]>("/api/admin/rooms");
  return response.success ? (response.data || []).map(mapRoomFromApi) : [];
}

export async function getRoom(id: string): Promise<Room | null> {
  const response = await apiRequest<RoomApiModel>(`/api/admin/rooms/${id}`);
  return response.success && response.data ? mapRoomFromApi(response.data) : null;
}

export async function createRoom(data: CreateRoomRequest): Promise<Room | null> {
  const response = await apiRequest<RoomApiModel>("/api/admin/rooms", {
    method: "POST",
    body: JSON.stringify(mapRoomCreateToApi(data)),
  });
  return response.success && response.data ? mapRoomFromApi(response.data) : null;
}

export async function updateRoom(id: string, data: UpdateRoomRequest): Promise<Room | null> {
  const response = await apiRequest<RoomApiModel>(`/api/admin/rooms/${id}`, {
    method: "PUT",
    body: JSON.stringify(mapRoomUpdateToApi(data)),
  });
  return response.success && response.data ? mapRoomFromApi(response.data) : null;
}

export async function deleteRoom(id: string): Promise<boolean> {
  const response = await apiRequest(`/api/admin/rooms/${id}`, {
    method: "DELETE",
  });
  return response.success || false;
}
