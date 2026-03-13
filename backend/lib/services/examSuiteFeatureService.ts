import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export const examSuiteFeatureService = {
  async isEnabledForTenant(tenantId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("school_settings")
      .select("payment_config, enrollment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve feature flags: ${error.message}`);
    }

    const paymentConfig = asObject(data?.payment_config);
    const enrollmentConfig = asObject(data?.enrollment_config);

    const features = asObject(paymentConfig.features);
    const modules = asObject(paymentConfig.modules);
    const enrollmentModules = asObject(enrollmentConfig.modules);

    const directFlag =
      toBoolean(paymentConfig.examSuite)
      || toBoolean(paymentConfig.exam_suite)
      || toBoolean(paymentConfig.exam_suite_enabled)
      || toBoolean(features.examSuite)
      || toBoolean(features.exam_suite)
      || toBoolean(features.examsuite)
      || toBoolean(modules.examSuite)
      || toBoolean(modules.exam_suite)
      || toBoolean(modules.examsuite)
      || toBoolean(enrollmentModules.examSuite)
      || toBoolean(enrollmentModules.exam_suite)
      || toBoolean(enrollmentModules.examsuite);

    return directFlag;
  },
};
