import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { defaultEnrollmentFormConfig } from "@/lib/constants/defaultEnrollmentFormConfig";

export interface EnrollmentFormConfigRecord {
  tenant_id: string;
  config: unknown;
  is_published: boolean;
  updated_by: string | null;
}

function isMissingEnrollmentConfigTable(message: string) {
  return message.includes("enrollment_form_configs");
}

function extractFormBuilderConfig(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return defaultEnrollmentFormConfig;
  }

  const record = raw as Record<string, unknown>;
  if (record.form_builder && typeof record.form_builder === "object") {
    return record.form_builder;
  }

  if (Array.isArray(record.sections)) {
    return record;
  }

  return defaultEnrollmentFormConfig;
}

export const enrollmentFormConfigService = {
  async getByTenantId(tenantId: string): Promise<unknown> {
    const { data, error } = await supabaseAdmin
      .from("enrollment_form_configs")
      .select("config")
      .eq("tenant_id", tenantId)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      if (isMissingEnrollmentConfigTable(error.message)) {
        const { data: settings, error: settingsError } = await supabaseAdmin
          .from("school_settings")
          .select("enrollment_config")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (settingsError) {
          throw new Error(`Failed to load enrollment form config fallback: ${settingsError.message}`);
        }

        return extractFormBuilderConfig(settings?.enrollment_config);
      }
      throw new Error(`Failed to load enrollment form config: ${error.message}`);
    }

    return data?.config ?? defaultEnrollmentFormConfig;
  },

  async saveForTenant(tenantId: string, userId: string, config: unknown): Promise<EnrollmentFormConfigRecord> {
    const { data, error } = await supabaseAdmin
      .from("enrollment_form_configs")
      .upsert(
        {
          tenant_id: tenantId,
          config,
          is_published: true,
          updated_by: userId,
        },
        {
          onConflict: "tenant_id",
        }
      )
      .select("tenant_id, config, is_published, updated_by")
      .single();

    if (error || !data) {
      if (!error || !isMissingEnrollmentConfigTable(error.message)) {
        throw new Error(`Failed to save enrollment form config: ${error?.message}`);
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from("school_settings")
        .select("id, enrollment_config")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existingError) {
        throw new Error(`Failed to read school settings fallback: ${existingError.message}`);
      }

      const mergedEnrollmentConfig = {
        ...(existing?.enrollment_config && typeof existing.enrollment_config === "object"
          ? (existing.enrollment_config as Record<string, unknown>)
          : {}),
        form_builder: config,
      };

      if (existing?.id) {
        const { error: updateError } = await supabaseAdmin
          .from("school_settings")
          .update({
            enrollment_config: mergedEnrollmentConfig,
          })
          .eq("id", existing.id);

        if (updateError) {
          throw new Error(`Failed to save fallback enrollment config: ${updateError.message}`);
        }
      } else {
        const { error: insertError } = await supabaseAdmin.from("school_settings").insert({
          tenant_id: tenantId,
          enrollment_config: mergedEnrollmentConfig,
        });

        if (insertError) {
          throw new Error(`Failed to create fallback school settings: ${insertError.message}`);
        }
      }

      return {
        tenant_id: tenantId,
        config,
        is_published: true,
        updated_by: userId,
      };
    }

    return data as EnrollmentFormConfigRecord;
  },
};
