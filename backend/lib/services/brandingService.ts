import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { BrandingFontFamily, BrandingStyleVariant, UpdateBrandingInput } from "@/lib/validators/brandingSchemas";

const TENANT_ASSETS_BUCKET = "tenant-assets";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = new Set(["image/png", "image/svg+xml", "image/jpeg"]);

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

export interface PublicTenantBranding {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  branding: TenantBranding;
}

export const DEFAULT_TENANT_BRANDING = {
  primary_color: "#7C3AED",
  secondary_color: "#F1F5F9",
  accent_color: "#A78BFA",
  font_family: "inter" as const,
  style_variant: "clean" as const,
};

function isMissingTenantBrandingTableError(message: string | undefined): boolean {
  return typeof message === "string" && message.includes("Could not find the table 'public.tenant_branding'");
}

function normalizeBranding(row: Partial<TenantBranding> & { tenant_id: string; id?: string; updated_at?: string }): TenantBranding {
  return {
    id: row.id || "",
    tenant_id: row.tenant_id,
    logo_url: row.logo_url ?? null,
    primary_color: row.primary_color || DEFAULT_TENANT_BRANDING.primary_color,
    secondary_color: row.secondary_color || DEFAULT_TENANT_BRANDING.secondary_color,
    accent_color: row.accent_color ?? DEFAULT_TENANT_BRANDING.accent_color,
    font_family: (row.font_family as BrandingFontFamily) || DEFAULT_TENANT_BRANDING.font_family,
    style_variant: (row.style_variant as BrandingStyleVariant) || DEFAULT_TENANT_BRANDING.style_variant,
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function resolveFileExtension(file: File): string {
  const byMime: Record<string, string> = {
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/jpeg": "jpg",
  };

  if (byMime[file.type]) {
    return byMime[file.type];
  }

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".svg")) return "svg";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "jpg";
  return "png";
}

async function ensureTenantBrandingRow(tenantId: string): Promise<TenantBranding> {
  const { data: existing, error } = await supabaseAdmin
    .from("tenant_branding")
    .select("id, tenant_id, logo_url, primary_color, secondary_color, accent_color, font_family, style_variant, updated_at")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    if (isMissingTenantBrandingTableError(error.message)) {
      return normalizeBranding({ tenant_id: tenantId });
    }

    throw new Error(`Failed to load tenant branding: ${error.message}`);
  }

  if (existing) {
    return normalizeBranding(existing as Partial<TenantBranding> & { tenant_id: string });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("tenant_branding")
    .insert({
      tenant_id: tenantId,
      ...DEFAULT_TENANT_BRANDING,
    })
    .select("id, tenant_id, logo_url, primary_color, secondary_color, accent_color, font_family, style_variant, updated_at")
    .single();

  if (insertError && isMissingTenantBrandingTableError(insertError.message)) {
    return normalizeBranding({ tenant_id: tenantId });
  }

  if (insertError || !inserted) {
    throw new Error(`Failed to initialize tenant branding: ${insertError?.message || "unknown error"}`);
  }

  return normalizeBranding(inserted as Partial<TenantBranding> & { tenant_id: string });
}

async function uploadLogo(tenantId: string, logoFile: File): Promise<string> {
  if (!ALLOWED_LOGO_MIME_TYPES.has(logoFile.type)) {
    throw new Error("Unsupported logo type. Use PNG, SVG, or JPG.");
  }

  if (logoFile.size > MAX_LOGO_BYTES) {
    throw new Error("Logo exceeds max size of 2MB.");
  }

  const extension = resolveFileExtension(logoFile);
  const storagePath = `${tenantId}/branding/logo-${Date.now()}-${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(TENANT_ASSETS_BUCKET)
    .upload(storagePath, logoFile, {
      upsert: true,
      contentType: logoFile.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Failed to upload logo: ${uploadError.message}`);
  }

  return supabaseAdmin.storage.from(TENANT_ASSETS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export const brandingService = {
  getDefaults() {
    return { ...DEFAULT_TENANT_BRANDING };
  },

  async getTenantBranding(tenantId: string): Promise<TenantBranding> {
    return ensureTenantBrandingRow(tenantId);
  },

  async getPublicTenantBranding(tenantSlug: string): Promise<PublicTenantBranding | null> {
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug")
      .eq("slug", tenantSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (tenantError) {
      throw new Error(`Failed to load tenant: ${tenantError.message}`);
    }

    if (!tenant) {
      return null;
    }

    const branding = await ensureTenantBrandingRow(tenant.id);

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      branding,
    };
  },

  async updateTenantBranding(tenantId: string, input: UpdateBrandingInput, logoFile?: File | null): Promise<TenantBranding> {
    const current = await ensureTenantBrandingRow(tenantId);

    let logoUrl = current.logo_url;
    if (input.remove_logo) {
      logoUrl = null;
    }

    if (logoFile) {
      logoUrl = await uploadLogo(tenantId, logoFile);
    } else if (input.logo_url !== undefined) {
      logoUrl = input.logo_url;
    }

    const payload = {
      tenant_id: tenantId,
      logo_url: logoUrl,
      primary_color: input.primary_color ?? current.primary_color,
      secondary_color: input.secondary_color ?? current.secondary_color,
      accent_color: input.accent_color === undefined ? current.accent_color : input.accent_color,
      font_family: input.font_family ?? current.font_family,
      style_variant: input.style_variant ?? current.style_variant,
    };

    const { data, error } = await supabaseAdmin
      .from("tenant_branding")
      .upsert(payload, { onConflict: "tenant_id" })
      .select("id, tenant_id, logo_url, primary_color, secondary_color, accent_color, font_family, style_variant, updated_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update branding: ${error?.message || "unknown error"}`);
    }

    return normalizeBranding(data as Partial<TenantBranding> & { tenant_id: string });
  },
};
