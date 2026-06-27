import { resolveAccessToken } from "./client";

async function authFetch(url: string): Promise<Blob> {
  const token = await resolveAccessToken();
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(url, { method: "GET", headers });

  if (!response.ok) {
    let backendMessage: string | null = null;
    try {
      const payload = await response.json();
      if (payload?.error?.message && typeof payload.error.message === "string") {
        backendMessage = payload.error.message;
      }
    } catch { /* ignore */ }
    throw new Error(backendMessage || "No se pudo generar el documento");
  }

  return response.blob();
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function downloadAttendanceSheetPdf(classId: string, month: string): Promise<Blob> {
  const search = new URLSearchParams({ classId, month });
  return authFetch(`${API_URL}/api/admin/attendance/sheets/download?${search.toString()}`);
}

export async function downloadBulkAttendancePdf(month: string): Promise<Blob> {
  const search = new URLSearchParams({ month });
  return authFetch(`${API_URL}/api/admin/attendance/bulk-download?${search.toString()}`);
}
