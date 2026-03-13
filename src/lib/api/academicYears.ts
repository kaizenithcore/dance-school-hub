import { apiRequest } from "./client";

export interface AcademicYear {
  id: string;
  yearCode: string;
  displayName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  dataRetentionMonths: number;
  archivedAt: string | null;
}

export interface AcademicYearResponse {
  academicYear: AcademicYear;
}

export interface AcademicYearsListResponse {
  academicYears: AcademicYear[];
  currentAcademicYearId: string | null;
}

export interface CreateAcademicYearInput {
  yearCode: string;
  displayName: string;
  startDate: string;
  endDate: string;
  dataRetentionMonths?: number;
}

export interface UpdateCurrentAcademicYearInput {
  academicYearId: string;
}

export const getAcademicYears = async (): Promise<AcademicYearsListResponse> => {
  const response = await apiRequest<AcademicYearsListResponse>("/api/admin/academic-years");
  if (!response.success) {
    throw new Error(response.error?.message || "No se pudieron cargar los años académicos");
  }
  return response.data || { academicYears: [], currentAcademicYearId: null };
};

export const createAcademicYear = async (input: CreateAcademicYearInput): Promise<AcademicYearResponse> => {
  const response = await apiRequest<AcademicYearResponse>("/api/admin/academic-years", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo crear el año académico");
  }
  return response.data || { academicYear: {} as AcademicYear };
};

export const setCurrentAcademicYear = async (input: UpdateCurrentAcademicYearInput): Promise<AcademicYearResponse> => {
  const response = await apiRequest<AcademicYearResponse>("/api/admin/academic-years/current", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo actualizar el año académico actual");
  }
  return response.data || { academicYear: {} as AcademicYear };
};
