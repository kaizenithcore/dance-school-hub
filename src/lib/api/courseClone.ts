import { apiRequest } from "./client";

export interface CourseCloneDryRun {
  sourcePeriod: string;
  targetPeriod: string;
  sourceClassCount: number;
  sourceScheduleCount: number;
  sampleClassNames: string[];
}

export interface CloneJob {
  id: string;
  sourcePeriod: string;
  targetPeriod: string;
  status: "queued" | "processing" | "completed" | "failed";
  summary: Record<string, unknown>;
  options: Record<string, unknown>;
  createdAt: string;
}

export async function getCloneJobs() {
  const response = await apiRequest<CloneJob[]>("/api/admin/course-clone");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar las ejecuciones de duplicación");
  }

  return response.data;
}

export async function runCloneDryRun(payload: { sourcePeriod: string; targetPeriod: string }) {
  const response = await apiRequest<CourseCloneDryRun>("/api/admin/course-clone", {
    method: "POST",
    body: JSON.stringify({ ...payload, action: "dry_run" }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo ejecutar la simulación");
  }

  return response.data;
}

export async function applyCourseClone(payload: { sourcePeriod: string; targetPeriod: string }) {
  const response = await apiRequest<{ jobId: string; summary: Record<string, unknown> }>("/api/admin/course-clone", {
    method: "POST",
    body: JSON.stringify({ ...payload, action: "apply" }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo ejecutar el clonado");
  }

  return response.data;
}
