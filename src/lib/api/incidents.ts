import { apiRequest } from "./client";

export type IncidentType = "absence" | "injury" | "group_change" | "other";
export type IncidentStatus = "open" | "resolved";

export interface IncidentRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string | null;
  className: string | null;
  type: IncidentType;
  status: IncidentStatus;
  startDate: string;
  endDate: string | null;
  notes: string;
  createdBy: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export async function getIncidents(params?: {
  fromDate?: string;
  toDate?: string;
  status?: IncidentStatus;
  studentId?: string;
  limit?: number;
}): Promise<IncidentRecord[]> {
  const search = new URLSearchParams();

  if (params?.fromDate) search.set("fromDate", params.fromDate);
  if (params?.toDate) search.set("toDate", params.toDate);
  if (params?.status) search.set("status", params.status);
  if (params?.studentId) search.set("studentId", params.studentId);
  if (params?.limit) search.set("limit", String(params.limit));

  const query = search.toString();
  const endpoint = `/api/admin/incidents${query ? `?${query}` : ""}`;
  const response = await apiRequest<IncidentRecord[]>(endpoint);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar las incidencias");
  }

  return response.data;
}

export async function createIncident(payload: {
  studentId: string;
  classId?: string | null;
  type: IncidentType;
  startDate: string;
  endDate?: string | null;
  notes?: string;
}) {
  const response = await apiRequest<IncidentRecord>("/api/admin/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo guardar la incidencia");
  }

  return response.data;
}

export async function updateIncident(
  incidentId: string,
  payload: {
    status?: IncidentStatus;
    endDate?: string | null;
    notes?: string;
  }
) {
  const response = await apiRequest<IncidentRecord>(`/api/admin/incidents/${incidentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar la incidencia");
  }

  return response.data;
}
