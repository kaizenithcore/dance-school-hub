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
  is_locked?: boolean;
  recurrence?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScheduleWithRelations extends ClassSchedule {
  className?: string;
  roomName?: string;
  capacity?: number;
  studentCount?: number;
  branchName?: string;
  branchSlug?: string;
  branchAddress?: string;
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
  isLocked?: boolean;
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
  isLocked?: boolean;
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

export type ScheduleInsightSeverity = "high" | "medium" | "low";
// Sprint 6: Updated to match backend insight types
export type ScheduleInsightType = 
  | "low_demand"      // Classes <40% occupancy
  | "over_demand"     // Classes >capacity or with waitlist
  | "unused_teacher"  // Teachers with 0 classes scheduled
  | "schedule_gap"    // Teachers with fragmented schedules (gaps >= 120 min)
  | "unused_room";    // Rooms with minimal usage (<20%)

export interface ScheduleInsight {
  id: string;
  type: ScheduleInsightType;
  severity: ScheduleInsightSeverity;
  title: string;
  description: string;
  suggestedAction: string;
  classId?: string;
  className?: string;
  teacherId?: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
  weekday?: number;
  metrics: Record<string, string | number>;
}

export interface ScheduleInsightsResult {
  generatedAt: string;
  summary: {
    totalAlerts: number;
    high: number;
    medium: number;
    low: number;
    lowDemandClasses: number;
    overDemandClasses: number;
    unusedTeachers: number;      // Sprint 6: Count of unused teachers
    scheduleGaps: number;         // Sprint 6: Renamed from teacherGaps
    unusedRooms: number;          // Sprint 6: Renamed from underutilizedRooms
  };
  metrics: {
    totalClassesWithSchedule: number;
    avgClassOccupancyPct: number;
    totalRooms: number;
    avgRoomUtilizationPct: number;
  };
  alerts: ScheduleInsight[];
}

export interface ScheduleProposalCreateOperation {
  classId: string;
  roomId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface ScheduleProposal {
  id: string;
  label: "A" | "B" | "C";
  strategy: string;
  score: number;
  /** Number of locked sessions kept as fixed anchors */
  lockedSessions: number;
  summary: {
    requestedSessions: number;
    plannedSessions: number;
    unplannedSessions: number;
  };
  creates: ScheduleProposalCreateOperation[];
  /** IDs of existing unlocked schedules to remove when applying. Only set when replaceUnlocked=true */
  schedulesToDelete: string[];
}

export interface ScheduleProposalsResponse {
  generatedAt: string;
  replaceUnlocked: boolean;
  proposals: ScheduleProposal[];
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
    const errorMsg = response.error?.message || "No se pudo guardar el horario";
    const details = response.error?.details;
    let fullMessage = errorMsg;
    
    // If there are validation details, add them to the message
    if (details && Array.isArray(details)) {
      const firstError = details[0] as any;
      if (firstError?.message) {
        fullMessage = `${errorMsg}: ${firstError.message}`;
        if (firstError?.path) {
          fullMessage += ` (Campo: ${firstError.path.join('.')})`;
        }
      }
    }
    
    throw new Error(fullMessage);
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

export async function getScheduleInsights(): Promise<ScheduleInsightsResult | null> {
  const response = await apiRequest<ScheduleInsightsResult>("/api/admin/schedule/insights");
  return response.success ? response.data || null : null;
}

export async function generateScheduleProposals(replaceUnlocked = false): Promise<ScheduleProposalsResponse | null> {
  const response = await apiRequest<ScheduleProposalsResponse>("/api/admin/schedule/proposals/generate", {
    method: "POST",
    body: JSON.stringify({ includeExisting: true, replaceUnlocked }),
  });

  return response.success ? response.data || null : null;
}

export async function applyScheduleProposal(proposal: ScheduleProposal): Promise<{
  proposalId: string;
  deletedPriorSchedules: number;
  result: {
    created: ScheduleWithRelations[];
    updated: ScheduleWithRelations[];
    deleted: string[];
    errors: Array<{ operation: string; error: string }>;
  };
} | null> {
  const response = await apiRequest<{
    proposalId: string;
    deletedPriorSchedules: number;
    result: {
      created: ScheduleWithRelations[];
      updated: ScheduleWithRelations[];
      deleted: string[];
      errors: Array<{ operation: string; error: string }>;
    };
  }>("/api/admin/schedule/proposals/apply", {
    method: "POST",
    body: JSON.stringify({
      proposalId: proposal.id,
      creates: proposal.creates,
      schedulesToDelete: proposal.schedulesToDelete,
    }),
  });

  return response.success ? response.data || null : null;
}
