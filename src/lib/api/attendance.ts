import { resolveAccessToken } from "./client";

export async function downloadAttendanceSheetPdf(classId: string, month: string): Promise<Blob> {
  const token = await resolveAccessToken();
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const search = new URLSearchParams({ classId, month });
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const response = await fetch(`${apiUrl}/api/admin/attendance/sheets/download?${search.toString()}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let backendMessage: string | null = null;
    try {
      const payload = await response.json();
      if (payload?.error?.message && typeof payload.error.message === "string") {
        backendMessage = payload.error.message;
      }
    } catch {
      // Fall back to a default message when the backend response is not JSON.
    }

    throw new Error(backendMessage || "No se pudo generar la hoja de asistencia");
  }

  return response.blob();
}
