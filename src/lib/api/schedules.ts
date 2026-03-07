import { apiRequest } from "./client";

export interface ClassSchedule {
  id: string;
  tenant_id: string;
  class_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  weekday: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  recurrence?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScheduleWithRelations extends ClassSchedule {
  className?: string;
  roomName?: string;
}

export interface CreateScheduleRequest {
  classId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  weekday: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface UpdateScheduleRequest {
  classId?: string;
  roomId?: string;
  startTime?: string;
  endTime?: string;
  weekday?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface BatchScheduleOperation {
  creates?: CreateScheduleRequest[];
  updates?: (UpdateScheduleRequest & { id: string })[];
  deletes?: string[];
}

export interface ListSchedulesQuery {
  classId?: string;
  roomId?: string;
  weekday?: number;
  fromDate?: string;
  toDate?: string;
}

export async function getSchedules(query?: ListSchedulesQuery): Promise<ScheduleWithRelations[]> {
  const params = new URLSearchParams();
  if (query?.classId) params.append("classId", query.classId);
  if (query?.roomId) params.append("roomId", query.roomId);
  if (query?.weekday) params.append("weekday", query.weekday.toString());
  if (query?.fromDate) params.append("fromDate", query.fromDate);
  if (query?.toDate) params.append("toDate", query.toDate);

  const url = `/api/admin/schedule${params.toString() ? "?" + params.toString() : ""}`;
  const response = await apiRequest<ScheduleWithRelations[]>(url);
  return response.success ? response.data || [] : [];
}

export async function getSchedule(id: string): Promise<ScheduleWithRelations | null> {
  const response = await apiRequest<ScheduleWithRelations>(`/api/admin/schedule/${id}`);
  return response.success ? response.data || null : null;
}

export async function createSchedule(data: CreateScheduleRequest): Promise<ScheduleWithRelations | null> {
  const response = await apiRequest<ScheduleWithRelations>("/api/admin/schedule", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.success ? response.data || null : null;
}

export async function updateSchedule(id: string, data: UpdateScheduleRequest): Promise<ScheduleWithRelations | null> {
  const response = await apiRequest<ScheduleWithRelations>(`/api/admin/schedule/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.success ? response.data || null : null;
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const response = await apiRequest(`/api/admin/schedule/${id}`, {
    method: "DELETE",
  });
  return response.success || false;
}

export async function batchSaveSchedules(operations: BatchScheduleOperation): Promise<{
  created: ScheduleWithRelations[];
  updated: ScheduleWithRelations[];
  deleted: string[];
  errors: Array<{ operation: string; error: string }>;
}> {
  const response = await apiRequest<{
    created: ScheduleWithRelations[];
    updated: ScheduleWithRelations[];
    deleted: string[];
    errors: Array<{ operation: string; error: string }>;
  }>("/api/admin/schedule/save", {
    method: "POST",
    body: JSON.stringify(operations),
  });
  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo guardar el horario");
  }

  return response.data || { created: [], updated: [], deleted: [], errors: [] };
}

export async function getPublicSchedule(
  tenantSlug: string,
  fromDate?: string,
  toDate?: string
): Promise<ScheduleWithRelations[]> {
  const params = new URLSearchParams();
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);

  const url = `/api/public/schedule/${tenantSlug}${
    params.toString() ? "?" + params.toString() : ""
  }`;
  const response = await apiRequest<ScheduleWithRelations[]>(url);
  return response.success ? response.data || [] : [];
}
