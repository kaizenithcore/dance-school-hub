import { apiRequest } from "./client";

export interface SchoolSettingsSchool {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  tagline: string;
  description: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

export interface SchoolSettingsPayload {
  school: SchoolSettingsSchool;
  payment: Record<string, unknown>;
  schedule: Record<string, unknown>;
  notifications: Record<string, unknown>;
  security: Record<string, unknown>;
  billing: {
    planType: string;
    features?: Record<string, unknown>;
  };
}

export async function getSchoolSettings(): Promise<SchoolSettingsPayload | null> {
  const response = await apiRequest<SchoolSettingsPayload>("/api/admin/settings");
  return response.success ? response.data || null : null;
}

export async function updateSchoolSettings(payload: SchoolSettingsPayload): Promise<SchoolSettingsPayload | null> {
  const response = await apiRequest<SchoolSettingsPayload>("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.success ? response.data || null : null;
}
