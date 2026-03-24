import { apiRequest } from "@/lib/api/client";
import { resolveAccessToken } from "@/lib/api/client";
import { readPortalCache, writePortalCache } from "@/lib/portalCache";

export interface StudentPortalContext {
  userId: string;
  tenantId: string;
  studentId: string;
  studentName: string;
}

export interface StudentPortalClass {
  enrollmentId: string;
  classId: string;
  status: "pending" | "confirmed" | "cancelled";
  name: string;
  day: string;
  time: string;
  room: string;
  teacher: string;
  style: string;
  level: string;
  capacity: number;
  monthlyPrice: number;
  schedules: Array<{
    id: string;
    weekday: number;
    day: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface StudentPortalAchievement {
  id: string;
  title: string;
  category: "attendance" | "events" | "milestones" | "certifications";
  earned: boolean;
}

export interface StudentPortalProgress {
  classesCompleted: number;
  eventsAttended: number;
  passedCertifications: number;
  xp: number;
  levelNumber: number;
  xpToNextLevel: number;
  attendanceRate: number;
  currentStreakDays: number;
  achievements: StudentPortalAchievement[];
  nextAchievements: StudentPortalAchievement[];
}

export interface StudentPortalXpItem {
  id: string;
  type: "class_completed" | "event_attended" | "certification_passed";
  label: string;
  xpDelta: number;
  createdAt: string;
}

export interface StudentPortalCertification {
  candidateId: string;
  examId: string;
  examName: string;
  discipline: string;
  level: string;
  examDate: string;
  finalGrade: number | null;
  comments: string | null;
  certificateUrl: string | null;
  certificateGeneratedAt: string | null;
  status: "passed" | "failed" | "pending";
}

export interface StudentPortalEvent {
  id: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  location: string;
  description: string | null;
  status: "draft" | "published";
  attended: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface StudentPortalPayment {
  id: string;
  enrollmentId: string | null;
  className: string;
  concept: string;
  amountCents: number;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paidAt: string | null;
  dueAt: string | null;
  createdAt: string;
  receiptId: string | null;
  receiptNumber: string | null;
  checkoutAvailable: boolean;
}

const STUDENT_CONTEXT_CACHE_KEY = "student-context";
const STUDENT_SCHEDULE_CACHE_KEY = "student-schedule";
const STUDENT_EVENTS_CACHE_PREFIX = "student-events";
const STUDENT_CACHE_TTL_MS = 3 * 60 * 1000;
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

function unwrapOrThrow<T>(
  response: Awaited<ReturnType<typeof apiRequest<T>>>,
  fallbackMessage: string
): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.error?.message || fallbackMessage);
  }
  return response.data;
}

export async function getStudentPortalContext(): Promise<StudentPortalContext> {
  const cached = readPortalCache<StudentPortalContext>(STUDENT_CONTEXT_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const response = await apiRequest<StudentPortalContext>("/api/student/context");
  const data = unwrapOrThrow(response, "No se pudo cargar el contexto del alumno");
  writePortalCache(STUDENT_CONTEXT_CACHE_KEY, data, STUDENT_CACHE_TTL_MS);
  return data;
}

export async function getStudentPortalClasses(): Promise<{ student: { id: string; name: string }; classes: StudentPortalClass[] }> {
  const response = await apiRequest<{ student: { id: string; name: string }; classes: StudentPortalClass[] }>("/api/student/classes");
  return unwrapOrThrow(response, "No se pudo cargar las clases del alumno");
}

export async function getStudentPortalSchedule(): Promise<{
  student: { id: string; name: string };
  weeklySchedule: Array<{
    classId: string;
    className: string;
    day: string;
    weekday: number;
    startTime: string;
    endTime: string;
    room: string;
    teacher: string;
  }>;
}> {
  const cached = readPortalCache<{
    student: { id: string; name: string };
    weeklySchedule: Array<{
      classId: string;
      className: string;
      day: string;
      weekday: number;
      startTime: string;
      endTime: string;
      room: string;
      teacher: string;
    }>;
  }>(STUDENT_SCHEDULE_CACHE_KEY);

  if (cached) {
    return cached;
  }

  const response = await apiRequest<{
    student: { id: string; name: string };
    weeklySchedule: Array<{
      classId: string;
      className: string;
      day: string;
      weekday: number;
      startTime: string;
      endTime: string;
      room: string;
      teacher: string;
    }>;
  }>("/api/student/schedule");
  const data = unwrapOrThrow(response, "No se pudo cargar el horario del alumno");
  writePortalCache(STUDENT_SCHEDULE_CACHE_KEY, data, STUDENT_CACHE_TTL_MS);
  return data;
}

export async function getStudentPortalProgress(): Promise<StudentPortalProgress> {
  const response = await apiRequest<StudentPortalProgress>("/api/student/progress");
  return unwrapOrThrow(response, "No se pudo cargar el progreso del alumno");
}

export async function getStudentPortalXpHistory(limit = 20, offset = 0): Promise<PaginatedResult<StudentPortalXpItem>> {
  const query = buildQuery({ limit, offset });
  const response = await apiRequest<PaginatedResult<StudentPortalXpItem>>(`/api/student/progress/xp-history${query}`);
  return unwrapOrThrow(response, "No se pudo cargar el historial de XP");
}

export async function getStudentPortalCertifications(): Promise<StudentPortalCertification[]> {
  const response = await apiRequest<StudentPortalCertification[]>("/api/student/certifications");
  return unwrapOrThrow(response, "No se pudo cargar las certificaciones");
}

export async function listStudentPortalEvents(input?: {
  limit?: number;
  offset?: number;
  upcomingOnly?: boolean;
}): Promise<PaginatedResult<StudentPortalEvent>> {
  const query = buildQuery({
    limit: input?.limit,
    offset: input?.offset,
    upcomingOnly: input?.upcomingOnly,
  });

  const cacheKey = `${STUDENT_EVENTS_CACHE_PREFIX}:${query || "default"}`;
  const cached = readPortalCache<PaginatedResult<StudentPortalEvent>>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await apiRequest<PaginatedResult<StudentPortalEvent>>(`/api/student/events${query}`);
  const data = unwrapOrThrow(response, "No se pudo cargar eventos del alumno");
  writePortalCache(cacheKey, data, STUDENT_CACHE_TTL_MS);
  return data;
}

export async function confirmStudentEventAttendance(eventId: string): Promise<void> {
  const response = await apiRequest<{ success: boolean }>(`/api/student/events/${eventId}/attendance`, {
    method: "POST",
  });
  unwrapOrThrow(response, "No se pudo confirmar asistencia al evento");
}

export async function cancelStudentEventAttendance(eventId: string): Promise<void> {
  const response = await apiRequest<{ success: boolean }>(`/api/student/events/${eventId}/attendance`, {
    method: "DELETE",
  });
  unwrapOrThrow(response, "No se pudo cancelar asistencia al evento");
}

export async function listStudentEventParticipations(
  limit = 20,
  offset = 0
): Promise<
  PaginatedResult<{
    id: string;
    eventId: string;
    status: "confirmed" | "cancelled";
    eventName: string;
    eventDate: string | null;
    eventLocation: string | null;
    confirmedAt: string | null;
    createdAt: string;
  }>
> {
  const query = buildQuery({ limit, offset });
  const response = await apiRequest<
    PaginatedResult<{
      id: string;
      eventId: string;
      status: "confirmed" | "cancelled";
      eventName: string;
      eventDate: string | null;
      eventLocation: string | null;
      confirmedAt: string | null;
      createdAt: string;
    }>
  >(`/api/student/events/participations${query}`);

  return unwrapOrThrow(response, "No se pudo cargar participaciones en eventos");
}

async function fetchDownload(endpoint: string): Promise<Blob> {
  const token = await resolveAccessToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  if (!response.ok) {
    let message = "No se pudo descargar el archivo";
    try {
      const errorJson = await response.json();
      message = errorJson?.error?.message || message;
    } catch {
      // Ignore parse errors and keep fallback message.
    }
    throw new Error(message);
  }

  return response.blob();
}

export async function listStudentPortalPayments(
  limit = 20,
  offset = 0
): Promise<PaginatedResult<StudentPortalPayment>> {
  const query = buildQuery({ limit, offset });
  const response = await apiRequest<PaginatedResult<StudentPortalPayment>>(`/api/student/payments${query}`);
  return unwrapOrThrow(response, "No se pudo cargar pagos del alumno");
}

export async function createStudentEnrollmentCheckout(input: {
  enrollmentId: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<{ sessionId: string; url: string | null; amountCents: number }> {
  const response = await apiRequest<{ sessionId: string; url: string | null; amountCents: number }>(
    `/api/student/enrollments/${input.enrollmentId}/checkout`,
    {
      method: "POST",
      body: JSON.stringify({
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      }),
    }
  );

  return unwrapOrThrow(response, "No se pudo iniciar checkout");
}

export async function downloadStudentReceipt(paymentId: string): Promise<Blob> {
  return fetchDownload(`/api/student/payments/${paymentId}/receipt`);
}

export async function downloadStudentCalendarIcs(): Promise<Blob> {
  return fetchDownload("/api/student/exports/calendar");
}

export async function downloadStudentActivityExport(format: "json" | "csv" = "json"): Promise<Blob> {
  return fetchDownload(`/api/student/exports/activity?format=${format}`);
}
