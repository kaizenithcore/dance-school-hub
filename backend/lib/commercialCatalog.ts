import commercialCatalogJson from "../../catalog/commercialCatalog.json";

type PlanType = "starter" | "pro" | "enterprise";
type SubscriptionAddonKey = "customDomain" | "prioritySupport" | "waitlistAutomation" | "renewalAutomation";

interface FeatureFlags {
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

interface CommercialCatalog {
  plans: Record<PlanType, {
    billing: {
      monthlyPriceEur: number;
      annualEffectiveMonthlyPriceEur: number;
      annualTotalEur: number;
      annualSavingsLabel: string;
    };
    limits: {
      includedActiveStudents: number;
      marketingLabel: string;
    };
    extraStudentBlocks: {
      size: number;
      monthlyPriceEur: number;
    };
    featureFlags: FeatureFlags;
    includedSubscriptionAddons: SubscriptionAddonKey[];
  }>;
  subscriptionAddons: Record<SubscriptionAddonKey, {
    label: string;
    monthlyPriceEur: number;
    starterOnly?: boolean;
  }>;
  professionalServices: Record<string, unknown>;
}

export const commercialCatalog = commercialCatalogJson as CommercialCatalog;

export function getCommercialPlan(planType: PlanType) {
  return commercialCatalog.plans[planType];
}

export function getSubscriptionAddon(key: SubscriptionAddonKey) {
  return commercialCatalog.subscriptionAddons[key];
}