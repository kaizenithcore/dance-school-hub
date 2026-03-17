import commercialCatalogJson from "../../catalog/commercialCatalog.json";

export type PlanType = "starter" | "pro" | "enterprise";
export type SubscriptionAddonKey = "customDomain" | "prioritySupport" | "waitlistAutomation" | "renewalAutomation";

interface PlanFeatureFlags {
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
  planOrder: PlanType[];
  plans: Record<PlanType, {
    name: string;
    highlighted: boolean;
    cta: {
      label: string;
      href: string;
      external?: boolean;
    };
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
    featureFlags: PlanFeatureFlags;
    display: {
      features: string[];
      adminHighlights: string[];
    };
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
export const planOrder = commercialCatalog.planOrder;
export const planCatalog = commercialCatalog.plans;
export const subscriptionAddonCatalog = commercialCatalog.subscriptionAddons;
export const professionalServicesCatalog = commercialCatalog.professionalServices;

export function formatEuro(value: number) {
  return `${value.toLocaleString("es-ES")}€`;
}

export function getMinimumExtraStudentBlockPriceEur() {
  return Math.min(
    ...planOrder.map((planType) => planCatalog[planType].extraStudentBlocks.monthlyPriceEur)
  );
}

export function getSelectableSubscriptionAddons(planType: PlanType) {
  return (Object.entries(subscriptionAddonCatalog) as Array<[SubscriptionAddonKey, typeof subscriptionAddonCatalog[SubscriptionAddonKey]]>)
    .filter(([key, addon]) => {
      if (key === "waitlistAutomation" || key === "renewalAutomation") {
        return false;
      }

      if (addon.starterOnly && planType !== "starter") {
        return false;
      }

      return !planCatalog[planType].includedSubscriptionAddons.includes(key);
    })
    .map(([key, addon]) => ({ key, ...addon }));
}