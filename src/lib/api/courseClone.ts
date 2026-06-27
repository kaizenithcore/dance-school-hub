import { apiRequest } from "./client";

export interface ClonePreview {
  sourceYearId: string;
  targetYearId: string;
  classCount: number;
  scheduleCount: number;
  sampleNames: string[];
}

export interface CloneResult {
  classesCloned: number;
  schedulesCloned: number;
  classNames: string[];
}

export async function previewCourseClone(sourceYearId: string, targetYearId: string): Promise<ClonePreview> {
  const params = new URLSearchParams({ sourceYearId, targetYearId });
  const res = await apiRequest<ClonePreview>(`/api/admin/course-clone?${params.toString()}`);
  if (!res.success || !res.data) throw new Error(res.error?.message || "No se pudo previsualizar la clonación");
  return res.data;
}

export async function executeCourseClone(sourceYearId: string, targetYearId: string): Promise<CloneResult> {
  const res = await apiRequest<CloneResult>("/api/admin/course-clone", {
    method: "POST",
    body: JSON.stringify({ sourceYearId, targetYearId }),
  });
  if (!res.success || !res.data) throw new Error(res.error?.message || "No se pudo clonar el curso");
  return res.data;
}
