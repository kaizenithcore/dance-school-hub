import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { TenantRole } from "@/types/domain";

interface CreateTenantInput {
  tenantName: string;
  tenantSlug: string;
  ownerEmail: string;
  ownerDisplayName?: string;
  ownerPassword: string;
}

interface CreateTenantResult {
  tenantId: string;
  tenantSlug: string;
  ownerUserId: string;
  role: TenantRole;
}

function normalizeSlug(rawSlug: string): string {
  return rawSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueTenantSlug(tenantSlug: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .limit(1);

  if (error) {
    throw new Error(`Unable to validate tenant slug: ${error.message}`);
  }

  if ((data ?? []).length > 0) {
    throw new Error("Tenant slug is already in use.");
  }
}

export const tenantService = {
  async createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
    const normalizedSlug = normalizeSlug(input.tenantSlug);
    if (!normalizedSlug) {
      throw new Error("Tenant slug is invalid after normalization.");
    }

    await ensureUniqueTenantSlug(normalizedSlug);

    const {
      data: createdAuthUser,
      error: createAuthUserError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: input.ownerEmail,
      password: input.ownerPassword,
      email_confirm: true,
      user_metadata: {
        display_name: input.ownerDisplayName,
      },
    });

    if (createAuthUserError || !createdAuthUser.user) {
      throw new Error(createAuthUserError?.message ?? "Unable to create owner user.");
    }

    const ownerUserId = createdAuthUser.user.id;

    const { data: tenantRow, error: createTenantError } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: input.tenantName,
        slug: normalizedSlug,
      })
      .select("id, slug")
      .single();

    if (createTenantError || !tenantRow) {
      await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      throw new Error(createTenantError?.message ?? "Unable to create tenant.");
    }

    const tenantId = tenantRow.id;

    const { error: profileError } = await supabaseAdmin.from("user_profiles").upsert(
      {
        id: ownerUserId,
        email: input.ownerEmail,
        display_name: input.ownerDisplayName ?? null,
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
      await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      throw new Error(`Unable to create owner profile: ${profileError.message}`);
    }

    const { error: membershipError } = await supabaseAdmin.from("tenant_memberships").insert({
      tenant_id: tenantId,
      user_id: ownerUserId,
      role: "owner",
      is_active: true,
    });

    if (membershipError) {
      await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
      await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      throw new Error(`Unable to create owner membership: ${membershipError.message}`);
    }

    const { error: settingsError } = await supabaseAdmin.from("school_settings").insert({
      tenant_id: tenantId,
      branding: {},
      enrollment_config: {},
      payment_config: {},
      schedule_config: {},
      notification_config: {},
    });

    if (settingsError) {
      await supabaseAdmin.from("tenant_memberships").delete().eq("tenant_id", tenantId);
      await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
      await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      throw new Error(`Unable to create tenant settings: ${settingsError.message}`);
    }

    return {
      tenantId,
      tenantSlug: tenantRow.slug,
      ownerUserId,
      role: "owner",
    };
  },
};
