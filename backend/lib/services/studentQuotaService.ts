import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export class StudentLimitError extends Error {
  readonly code = "student_limit_reached";

  constructor(
    message: string,
    public readonly details: {
      planType: string;
      activeStudents: number;
      requestedSlots: number;
      maxActiveStudents: number;
      availableSlots: number;
    }
  ) {
    super(message);
    this.name = "StudentLimitError";
  }
}

export const studentQuotaService = {
  async getQuotaStatus(tenantId: string) {
    const [{ data: settings, error: settingsError }, { count, error: countError }] = await Promise.all([
      supabaseAdmin
        .from("school_settings")
        .select("payment_config")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabaseAdmin
        .from("students")
        .select("id", { head: true, count: "exact" })
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
    ]);

    if (settingsError) {
      throw new Error(`Failed to load tenant billing config: ${settingsError.message}`);
    }
    if (countError) {
      throw new Error(`Failed to count active students: ${countError.message}`);
    }

    const billing = featureEntitlementsService.resolveFromPaymentConfig(asObject(settings?.payment_config));
    const activeStudents = count || 0;
    const maxActiveStudents = billing.limits.maxActiveStudents;
    const availableSlots = Math.max(0, maxActiveStudents - activeStudents);

    return {
      planType: billing.planType,
      activeStudents,
      maxActiveStudents,
      availableSlots,
      canAddStudents: availableSlots > 0,
    };
  },

  async assertCanAddStudents(tenantId: string, amount = 1) {
    const requestedSlots = Number.isFinite(amount) ? Math.max(1, Math.floor(amount)) : 1;
    const quota = await this.getQuotaStatus(tenantId);

    if (quota.availableSlots < requestedSlots) {
      throw new StudentLimitError(
        `Has alcanzado el limite de alumnos activos de tu plan (${quota.maxActiveStudents}). Alumnos activos actuales: ${quota.activeStudents}.`,
        {
          planType: quota.planType,
          activeStudents: quota.activeStudents,
          requestedSlots,
          maxActiveStudents: quota.maxActiveStudents,
          availableSlots: quota.availableSlots,
        }
      );
    }
  },
};
