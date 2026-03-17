import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export const examSuiteFeatureService = {
  async isEnabledForTenant(tenantId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("school_settings")
      .select("payment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve feature flags: ${error.message}`);
    }

    const paymentConfig = asObject(data?.payment_config);
    const resolved = featureEntitlementsService.resolveFromPaymentConfig(paymentConfig);
    return resolved.features.examSuite;
  },
};
