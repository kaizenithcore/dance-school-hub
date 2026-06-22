import { apiRequest } from "@/lib/api/client";

export type BrandingFontFamily = "inter" | "poppins" | "montserrat" | "lato";
export type BrandingStyleVariant = "clean" | "rounded" | "bold";

export interface TenantBranding {
  id: string;
  tenant_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  font_family: BrandingFontFamily;
  style_variant: BrandingStyleVariant;
  updated_at: string;
}

export interface PublicTenantBrandingResponse {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  branding: TenantBranding;
}

export interface UpdateBrandingPayload {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string | null;
  font_family?: BrandingFontFamily;
  style_variant?: BrandingStyleVariant;
  remove_logo?: boolean;
}

export async function getTenantBranding(): Promise<TenantBranding | null> {
  const response = await apiRequest<TenantBranding>("/api/branding");
  return response.success ? response.data || null : null;
}

export async function getPublicTenantBranding(tenantSlug: string): Promise<PublicTenantBrandingResponse | null> {
  const response = await apiRequest<PublicTenantBrandingResponse>(`/api/public/branding/${tenantSlug}`);
  return response.success ? response.data || null : null;
}

export async function updateTenantBranding(payload: UpdateBrandingPayload, logoFile?: File | null): Promise<TenantBranding | null> {
  if (logoFile) {
    const formData = new FormData();
    formData.append("logo", logoFile);

    if (payload.primary_color) formData.append("primary_color", payload.primary_color);
    if (payload.secondary_color) formData.append("secondary_color", payload.secondary_color);
    if (payload.accent_color !== undefined) formData.append("accent_color", payload.accent_color || "");
    if (payload.font_family) formData.append("font_family", payload.font_family);
    if (payload.style_variant) formData.append("style_variant", payload.style_variant);
    if (payload.remove_logo) formData.append("remove_logo", "true");

    const multipartResponse = await apiRequest<TenantBranding>("/api/branding", {
      method: "POST",
      body: formData,
    });

    return multipartResponse.success ? multipartResponse.data || null : null;
  }

  const response = await apiRequest<TenantBranding>("/api/branding", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.success ? response.data || null : null;
}
