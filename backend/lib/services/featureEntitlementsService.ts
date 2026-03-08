type PlanType = "starter" | "pro" | "enterprise";

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
    autoScheduler: true,
    customRoles: true,
    maxCustomRoles: 3,
  },
};

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

export const featureEntitlementsService = {
  resolveFromPaymentConfig(paymentConfig: Record<string, unknown>) {
    const billing = asObject(paymentConfig.billing ?? paymentConfig.billing_config);
    const storedFeatures = asObject(paymentConfig.features);
    const addons = asObject(paymentConfig.addons);

    const planType = normalizePlanType(
      billing.planType
      ?? billing.plan_type
      ?? paymentConfig.planType
      ?? paymentConfig.plan_type
    );

    const defaults = PLAN_DEFAULTS[planType];

    const resolved: FeatureEntitlements = {
      smartEnrollmentLink: toBoolean(storedFeatures.smartEnrollmentLink, defaults.smartEnrollmentLink),
      attendanceSheetsPdf: toBoolean(storedFeatures.attendanceSheetsPdf, defaults.attendanceSheetsPdf),
      quickIncidents: toBoolean(storedFeatures.quickIncidents, defaults.quickIncidents),
      receptionMode: toBoolean(storedFeatures.receptionMode, defaults.receptionMode),
      waitlistAutomation: toBoolean(storedFeatures.waitlistAutomation, defaults.waitlistAutomation),
      renewalAutomation: toBoolean(storedFeatures.renewalAutomation, defaults.renewalAutomation),
      courseClone: toBoolean(storedFeatures.courseClone, defaults.courseClone),
      massCommunicationEmail: toBoolean(storedFeatures.massCommunicationEmail, defaults.massCommunicationEmail),
      massCommunicationWhatsapp: toBoolean(storedFeatures.massCommunicationWhatsapp, defaults.massCommunicationWhatsapp),
      autoScheduler: toBoolean(storedFeatures.autoScheduler, defaults.autoScheduler),
      customRoles: toBoolean(storedFeatures.customRoles, defaults.customRoles),
      maxCustomRoles: toInteger(storedFeatures.maxCustomRoles, defaults.maxCustomRoles),
    };

    if (toBoolean(addons.waitlistAutomation, false)) {
      resolved.waitlistAutomation = true;
    }
    if (toBoolean(addons.renewalAutomation, false)) {
      resolved.renewalAutomation = true;
    }
    if (toBoolean(addons.massCommunicationEmail, false)) {
      resolved.massCommunicationEmail = true;
    }
    if (toBoolean(addons.autoScheduler, false)) {
      resolved.autoScheduler = true;
    }

    return {
      planType,
      features: resolved,
    };
  },
};
