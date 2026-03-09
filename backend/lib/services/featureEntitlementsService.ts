export type PlanType = "starter" | "pro" | "enterprise";

export interface FeatureEntitlements {
  smartEnrollmentLink: boolean;
  attendanceSheetsPdf: boolean;
  quickIncidents: boolean;
  receptionMode: boolean;
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
}

interface PlanCommercialDefaults {
  monthlyPriceEur: number;
  includedActiveStudents: number;
  extraStudentsBlockSize: number;
  extraStudentsBlockPriceEur: number;
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
    };
  };
}

const PLAN_DEFAULTS: Record<PlanType, FeatureEntitlements> = {
  starter: {
    smartEnrollmentLink: true,
    attendanceSheetsPdf: true,
    quickIncidents: true,
    receptionMode: true,
    waitlistAutomation: false,
    renewalAutomation: false,
    courseClone: false,
    massCommunicationEmail: false,
    massCommunicationWhatsapp: false,
    autoScheduler: false,
    customRoles: false,
    maxCustomRoles: 0,
  },
  pro: {
    smartEnrollmentLink: true,
    attendanceSheetsPdf: true,
    quickIncidents: true,
    receptionMode: true,
    waitlistAutomation: true,
    renewalAutomation: true,
    courseClone: true,
    massCommunicationEmail: true,
    massCommunicationWhatsapp: false,
    autoScheduler: false,
    customRoles: false,
    maxCustomRoles: 0,
  },
  enterprise: {
    smartEnrollmentLink: true,
    attendanceSheetsPdf: true,
    quickIncidents: true,
    receptionMode: true,
    waitlistAutomation: true,
    renewalAutomation: true,
    courseClone: true,
    massCommunicationEmail: true,
    massCommunicationWhatsapp: false,
    autoScheduler: false,
    customRoles: true,
    maxCustomRoles: 10,
  },
};

const PLAN_COMMERCIAL_DEFAULTS: Record<PlanType, PlanCommercialDefaults> = {
  starter: {
    monthlyPriceEur: 179,
    includedActiveStudents: 300,
    extraStudentsBlockSize: 100,
    extraStudentsBlockPriceEur: 15,
  },
  pro: {
    monthlyPriceEur: 349,
    includedActiveStudents: 1200,
    extraStudentsBlockSize: 300,
    extraStudentsBlockPriceEur: 25,
  },
  enterprise: {
    monthlyPriceEur: 699,
    includedActiveStudents: 4000,
    extraStudentsBlockSize: 1000,
    extraStudentsBlockPriceEur: 50,
  },
};

const ADDON_CATALOG = {
  customDomain: { monthlyPriceEur: 29 },
  prioritySupport: { monthlyPriceEur: 49 },
  waitlistAutomation: { monthlyPriceEur: 19 },
} as const;

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

    const defaults = PLAN_DEFAULTS[planType];
    const commercialDefaults = PLAN_COMMERCIAL_DEFAULTS[planType];

    const resolvedAddons: BillingAddons = {
      customDomain: toBoolean(addons.customDomain, false),
      prioritySupport: toBoolean(addons.prioritySupport, false),
      waitlistAutomation: toBoolean(addons.waitlistAutomation, false),
    };

    const extraStudentBlocks = toNonNegativeInteger(
      billing.extraStudentBlocks
      ?? billing.extra_student_blocks
      ?? paymentConfig.extraStudentBlocks
      ?? paymentConfig.extra_student_blocks,
      0
    );

    const resolved: FeatureEntitlements = {
      smartEnrollmentLink: defaults.smartEnrollmentLink,
      attendanceSheetsPdf: defaults.attendanceSheetsPdf,
      quickIncidents: defaults.quickIncidents,
      receptionMode: defaults.receptionMode,
      waitlistAutomation: defaults.waitlistAutomation,
      renewalAutomation: defaults.renewalAutomation,
      courseClone: defaults.courseClone,
      massCommunicationEmail: defaults.massCommunicationEmail,
      massCommunicationWhatsapp: defaults.massCommunicationWhatsapp,
      autoScheduler: defaults.autoScheduler,
      customRoles: defaults.customRoles,
      maxCustomRoles: defaults.maxCustomRoles,
    };

    if (resolvedAddons.waitlistAutomation) {
      resolved.waitlistAutomation = true;
    }

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
          customDomain: { ...ADDON_CATALOG.customDomain },
          prioritySupport: { ...ADDON_CATALOG.prioritySupport },
          waitlistAutomation: { ...ADDON_CATALOG.waitlistAutomation },
        },
      },
    };
  },
};
