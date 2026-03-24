import { apiRequest } from "./client";
import type { DanceEvent, EventSession, ScheduleItem } from "@/lib/types/events";

interface EventApiModel {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  location: string;
  description?: string;
  ticketPrice?: number;
  capacity?: number;
  notes?: string;
  status: "draft" | "published";
  sessions: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime?: string;
    name?: string;
    notes?: string;
    schedule: Array<{
      id: string;
      time: string;
      duration: number;
      groupName: string;
      choreography?: string;
      teacher?: string;
      participantsCount?: number;
      room?: string;
      notes?: string;
      warnings?: Array<{ type: string; message: string; severity: string }>;
    }>;
  }>;
  createdAt: string;
}

interface EventListPaginatedResponse {
  items: EventApiModel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface SessionApiModel {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  name?: string;
  notes?: string;
}

interface ScheduleApiModel {
  id: string;
  time: string;
  duration: number;
  groupName: string;
  choreography?: string;
  teacher?: string;
  participantsCount?: number;
  room?: string;
  notes?: string;
}

interface ScheduleMutationResponse {
  item: ScheduleApiModel;
  warnings: Array<{ type: string; message: string; severity: string }>;
}

export interface EventInput {
  name: string;
  startDate: string;
  endDate?: string;
  location: string;
  description?: string;
  ticketPrice?: number;
  capacity?: number;
  notes?: string;
  status: "draft" | "published";
}

export interface SessionInput {
  date: string;
  startTime: string;
  endTime?: string;
  name?: string;
  notes?: string;
}

export interface ScheduleItemInput {
  time?: string;
  duration: number;
  groupName: string;
  choreography?: string;
  participantsCount?: number;
  notes?: string;
}

function mapEventInputToApi(data: EventInput) {
  return {
    name: data.name,
    start_date: data.startDate,
    end_date: data.endDate ?? null,
    location: data.location,
    description: data.description ?? null,
    ticket_price_cents: data.ticketPrice ?? null,
    capacity: data.capacity ?? null,
    notes: data.notes ?? null,
    status: data.status,
  };
}

function mapSessionInputToApi(data: SessionInput) {
  return {
    date: data.date,
    start_time: data.startTime,
    end_time: data.endTime ?? null,
    name: data.name ?? null,
    notes: data.notes ?? null,
  };
}

function mapScheduleInputToApi(data: ScheduleItemInput) {
  return {
    start_time: data.time ?? null,
    duration_minutes: data.duration,
    group_name: data.groupName,
    choreography: data.choreography ?? null,
    participants_count: data.participantsCount ?? null,
    notes: data.notes ?? null,
  };
}

export async function getEvents(): Promise<DanceEvent[]> {
  const response = await apiRequest<EventApiModel[] | EventListPaginatedResponse>("/api/admin/events");
  if (!response.success || !response.data) {
    return [];
  }

  if (Array.isArray(response.data)) {
    return response.data as DanceEvent[];
  }

  return response.data.items as DanceEvent[];
}

export async function getEvent(id: string): Promise<DanceEvent | null> {
  const response = await apiRequest<EventApiModel>(`/api/admin/events/${id}`);
  if (!response.success || !response.data) {
    return null;
  }

  return response.data as DanceEvent;
}

export async function createEvent(data: EventInput): Promise<DanceEvent | null> {
  const response = await apiRequest<EventApiModel>("/api/admin/events", {
    method: "POST",
    body: JSON.stringify(mapEventInputToApi(data)),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear el evento");
  }

  return response.data as DanceEvent;
}

export async function updateEvent(id: string, data: Partial<EventInput>): Promise<DanceEvent | null> {
  const response = await apiRequest<EventApiModel>(`/api/admin/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(mapEventInputToApi({
      name: data.name || "",
      startDate: data.startDate || "",
      location: data.location || "",
      status: data.status || "draft",
      endDate: data.endDate,
      description: data.description,
      ticketPrice: data.ticketPrice,
      capacity: data.capacity,
      notes: data.notes,
    })),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar el evento");
  }

  return response.data as DanceEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const response = await apiRequest(`/api/admin/events/${id}`, {
    method: "DELETE",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo eliminar el evento");
  }

  return true;
}

export async function publishEvent(id: string): Promise<DanceEvent | null> {
  const response = await apiRequest<EventApiModel>(`/api/admin/events/${id}/publish`, {
    method: "POST",
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo publicar el evento");
  }

  return response.data as DanceEvent;
}

export async function unpublishEvent(id: string): Promise<DanceEvent | null> {
  const response = await apiRequest<EventApiModel>(`/api/admin/events/${id}/unpublish`, {
    method: "POST",
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo despublicar el evento");
  }

  return response.data as DanceEvent;
}

export async function createSession(eventId: string, data: SessionInput): Promise<EventSession | null> {
  const response = await apiRequest<SessionApiModel>(`/api/admin/events/${eventId}/sessions`, {
    method: "POST",
    body: JSON.stringify(mapSessionInputToApi(data)),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear la sesión");
  }

  return {
    ...(response.data as EventSession),
    schedule: [],
  };
}

export async function updateSession(
  eventId: string,
  sessionId: string,
  data: Partial<SessionInput>
): Promise<EventSession | null> {
  const response = await apiRequest<SessionApiModel>(`/api/admin/events/${eventId}/sessions/${sessionId}`, {
    method: "PUT",
    body: JSON.stringify(mapSessionInputToApi({
      date: data.date || "",
      startTime: data.startTime || "",
      endTime: data.endTime,
      name: data.name,
      notes: data.notes,
    })),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar la sesión");
  }

  return {
    ...(response.data as EventSession),
    schedule: [],
  };
}

export async function deleteSession(eventId: string, sessionId: string): Promise<boolean> {
  const response = await apiRequest(`/api/admin/events/${eventId}/sessions/${sessionId}`, {
    method: "DELETE",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo eliminar la sesión");
  }

  return true;
}

export async function getScheduleItems(eventId: string, sessionId: string): Promise<ScheduleItem[]> {
  const response = await apiRequest<ScheduleApiModel[]>(
    `/api/admin/events/${eventId}/sessions/${sessionId}/schedule`
  );

  if (!response.success || !response.data) {
    return [];
  }

  return response.data as ScheduleItem[];
}

export async function createScheduleItem(
  eventId: string,
  sessionId: string,
  data: ScheduleItemInput
): Promise<ScheduleItem | null> {
  const response = await apiRequest<ScheduleMutationResponse>(
    `/api/admin/events/${eventId}/sessions/${sessionId}/schedule`,
    {
      method: "POST",
      body: JSON.stringify(mapScheduleInputToApi(data)),
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear el bloque");
  }

  return response.data.item as ScheduleItem;
}

export async function updateScheduleItem(
  eventId: string,
  sessionId: string,
  itemId: string,
  data: Partial<ScheduleItemInput>
): Promise<ScheduleItem | null> {
  const response = await apiRequest<ScheduleMutationResponse>(
    `/api/admin/events/${eventId}/sessions/${sessionId}/schedule/${itemId}`,
    {
      method: "PUT",
      body: JSON.stringify(
        mapScheduleInputToApi({
          duration: data.duration ?? 1,
          groupName: data.groupName ?? "",
          time: data.time,
          choreography: data.choreography,
          participantsCount: data.participantsCount,
          notes: data.notes,
        })
      ),
    }
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar el bloque");
  }

  return response.data.item as ScheduleItem;
}

export async function deleteScheduleItem(
  eventId: string,
  sessionId: string,
  itemId: string
): Promise<boolean> {
  const response = await apiRequest(
    `/api/admin/events/${eventId}/sessions/${sessionId}/schedule/${itemId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo eliminar el bloque");
  }

  return true;
}

export async function reorderScheduleItems(
  eventId: string,
  sessionId: string,
  positions: Array<{ id: string; position: number }>
): Promise<boolean> {
  const response = await apiRequest(`/api/admin/events/${eventId}/sessions/${sessionId}/schedule/reorder`, {
    method: "POST",
    body: JSON.stringify({ positions }),
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo reordenar la escaleta");
  }

  return true;
}

export async function recalcScheduleTimes(eventId: string, sessionId: string): Promise<boolean> {
  const response = await apiRequest(`/api/admin/events/${eventId}/sessions/${sessionId}/schedule/recalc-times`, {
    method: "POST",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudieron recalcular los tiempos");
  }

  return true;
}

export async function exportSchedulePdf(
  eventId: string,
  sessionId: string
): Promise<void> {
  try {
    const response = await fetch(
      `/api/admin/events/${eventId}/sessions/${sessionId}/schedule/export-pdf?tenant=${encodeURIComponent(
        sessionStorage.getItem("selectedAdminTenantId") || ""
      )}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`Error al generar el PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Use a default name if needed
    const filename = response.headers
      .get("content-disposition")
      ?.split("filename=")[1]
      ?.replace(/"/g, "") || "escaleta.pdf";
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el PDF";
    throw new Error(message);
  }
}