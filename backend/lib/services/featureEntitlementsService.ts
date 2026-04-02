import { getCommercialPlan, getSubscriptionAddon } from "@/lib/commercialCatalog";

export type PlanType = "starter" | "pro" | "enterprise";

export interface FeatureEntitlements {
  smartEnrollmentLink: boolean;
  attendanceSheetsPdf: boolean;
  quickIncidents: boolean;
  receptionMode: boolean;
  examSuite: boolean;
  waitlistAutomation: boolean;
  renewalAutomation: boolean;
  courseClone: boolean;
  massCommunicationEmail: boolean;
  massCommunicationWhatsapp: boolean;
  autoScheduler: boolean;
  customRoles: boolean;
  maxCustomRoles: number;
}

export interface BillingAddons {
  customDomain: boolean;
  prioritySupport: boolean;
  waitlistAutomation: boolean;
  renewalAutomation: boolean;
}

interface PlanCommercialDefaults {
  monthlyPriceEur: number;
  includedActiveStudents: number;
  extraStudentsBlockSize: number;
  extraStudentsBlockPriceEur: number;
}

interface PlanFeatureDefaults {
  smartEnrollmentLink: boolean;
  attendanceSheetsPdf: boolean;
  quickIncidents: boolean;
  receptionMode: boolean;
  examSuite?: boolean;
  certifier?: boolean;
  waitlistAutomation: boolean;
  renewalAutomation: boolean;
  courseClone: boolean;
  massCommunicationEmail: boolean;
  massCommunicationWhatsapp: boolean;
  autoScheduler: boolean;
  customRoles: boolean;
  maxCustomRoles: number;
}

interface AddonCatalogEntry {
  monthlyPriceEur: number;
}

export interface BillingResolution {
  planType: PlanType;
  features: FeatureEntitlements;
  addons: BillingAddons;
  limits: {
    includedActiveStudents: number;
    extraStudentBlocks: number;
    maxActiveStudents: number;
  };
  pricing: {
    monthlyPriceEur: number;
    extraStudentsBlockSize: number;
    extraStudentsBlockPriceEur: number;
    addons: {
      customDomain: AddonCatalogEntry;
      prioritySupport: AddonCatalogEntry;
      waitlistAutomation: AddonCatalogEntry;
      renewalAutomation: AddonCatalogEntry;
    };
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return fallback;
}

function normalizePlanType(value: unknown): PlanType {
  if (typeof value !== "string") {
    return "starter";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "enterprise") return "enterprise";
  if (normalized === "pro") return "pro";
  return "starter";
}

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  return toInteger(value, fallback);
}

export const featureEntitlementsService = {
  resolveFromPaymentConfig(paymentConfig: Record<string, unknown>): BillingResolution {
    const billing = asObject(paymentConfig.billing ?? paymentConfig.billing_config);
    const addons = {
      ...asObject(paymentConfig.addons),
      ...asObject(billing.addons),
    };

    const planType = normalizePlanType(
      billing.planType
      ?? billing.plan_type
      ?? paymentConfig.planType
      ?? paymentConfig.plan_type
    );

    const plan = getCommercialPlan(planType);
    const defaults = plan.featureFlags as PlanFeatureDefaults;
    const commercialDefaults: PlanCommercialDefaults = {
      monthlyPriceEur: plan.billing.monthlyPriceEur,
      includedActiveStudents: plan.limits.includedActiveStudents,
      extraStudentsBlockSize: plan.extraStudentBlocks.size,
      extraStudentsBlockPriceEur: plan.extraStudentBlocks.monthlyPriceEur,
    };

    const resolvedAddons: BillingAddons = {
      customDomain: toBoolean(addons.customDomain, false),
      prioritySupport: toBoolean(addons.prioritySupport, false),
      waitlistAutomation: false,
      renewalAutomation: false,
    };

    const configuredExtraStudentBlocks = toNonNegativeInteger(
      billing.extraStudentBlocks
      ?? billing.extra_student_blocks
      ?? paymentConfig.extraStudentBlocks
      ?? paymentConfig.extra_student_blocks,
      0
    );

    // Starter no admite bloques extra; se ignora cualquier valor legado en config.
    const extraStudentBlocks = planType === "starter" ? 0 : configuredExtraStudentBlocks;

    const resolved: FeatureEntitlements = {
      smartEnrollmentLink: defaults.smartEnrollmentLink,
      attendanceSheetsPdf: defaults.attendanceSheetsPdf,
      quickIncidents: defaults.quickIncidents,
      receptionMode: defaults.receptionMode,
      examSuite: toBoolean(defaults.examSuite ?? defaults.certifier, false),
      waitlistAutomation: defaults.waitlistAutomation,
      renewalAutomation: defaults.renewalAutomation,
      courseClone: defaults.courseClone,
      massCommunicationEmail: defaults.massCommunicationEmail,
      massCommunicationWhatsapp: defaults.massCommunicationWhatsapp,
      autoScheduler: defaults.autoScheduler,
      customRoles: defaults.customRoles,
      maxCustomRoles: defaults.maxCustomRoles,
    };

    const maxActiveStudents =
      commercialDefaults.includedActiveStudents
      + extraStudentBlocks * commercialDefaults.extraStudentsBlockSize;

    return {
      planType,
      features: resolved,
      addons: resolvedAddons,
      limits: {
        includedActiveStudents: commercialDefaults.includedActiveStudents,
        extraStudentBlocks,
        maxActiveStudents,
      },
      pricing: {
        monthlyPriceEur: commercialDefaults.monthlyPriceEur,
        extraStudentsBlockSize: commercialDefaults.extraStudentsBlockSize,
        extraStudentsBlockPriceEur: commercialDefaults.extraStudentsBlockPriceEur,
        addons: {
          customDomain: { monthlyPriceEur: getSubscriptionAddon("customDomain").monthlyPriceEur },
          prioritySupport: { monthlyPriceEur: getSubscriptionAddon("prioritySupport").monthlyPriceEur },
          waitlistAutomation: { monthlyPriceEur: getSubscriptionAddon("waitlistAutomation").monthlyPriceEur },
          renewalAutomation: { monthlyPriceEur: getSubscriptionAddon("renewalAutomation").monthlyPriceEur },
        },
      },
    };
  },
};
