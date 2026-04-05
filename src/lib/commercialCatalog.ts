import commercialCatalogJson from "../../catalog/commercialCatalog.json";

export type PlanType = "starter" | "pro" | "enterprise";
export type SubscriptionAddonKey = "customDomain" | "prioritySupport" | "waitlistAutomation" | "renewalAutomation";
export type SubscriptionAddonCatalogKey = SubscriptionAddonKey | "extraRoles";

interface PlanFeatureFlags {
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
    includedSubscriptionAddons: SubscriptionAddonCatalogKey[];
  }>;
  subscriptionAddons: Record<SubscriptionAddonCatalogKey, {
    label: string;
    monthlyPriceEur: number;
    description?: string;
    starterOnly?: boolean;
    upsellToPro?: boolean;
    enterpriseOnly?: boolean;
  }>;
  publicWeb?: {
    label: string;
    includedInPlans: PlanType[];
    positioning: string;
    description: string;
    includes: string[];
    limitations: string[];
    upgradeTo: string;
  };
  professionalServices: Record<string, unknown>;
  bundles?: Record<string, unknown>;
  studentApp?: Record<string, unknown>;
  pricingNarrative?: {
    anchor: string;
    comparison: string;
    focus: string;
  };
  examSuit?: {
    plans?: {
      associations?: {
        name: string;
        billing: {
          monthlyPriceEur: number;
          annualEffectiveMonthlyPriceEur: number;
          annualTotalEur: number;
          annualSavingsLabel?: string;
        };
      };
      schools?: {
        name: string;
        billing: {
          monthlyPriceEur: number;
          annualEffectiveMonthlyPriceEur: number;
          annualTotalEur: number;
          annualSavingsLabel?: string;
        };
      };
    };
  };
}

export const commercialCatalog = commercialCatalogJson as CommercialCatalog;
export const planOrder = commercialCatalog.planOrder;
export const planCatalog = commercialCatalog.plans;
export const subscriptionAddonCatalog = commercialCatalog.subscriptionAddons;
export const professionalServicesCatalog = commercialCatalog.professionalServices;
export const ANNUAL_FINANCING_TERMS = [3, 6] as const;

function isSelectableSubscriptionAddonKey(
  key: SubscriptionAddonCatalogKey
): key is SubscriptionAddonKey {
  return key !== "extraRoles";
}


export function formatEuro(value: number) {
  return `${value.toLocaleString("es-ES")}€`;
}

export function getInterestFreeInstallment(totalEur: number, months: number) {
  if (!Number.isFinite(totalEur) || totalEur <= 0 || !Number.isFinite(months) || months <= 0) {
    return 0;
  }

  return Math.round((totalEur / months) * 100) / 100;
}

export function formatAnnualFinancing(totalEur: number, terms: readonly number[] = ANNUAL_FINANCING_TERMS) {
  return terms.map((months) => ({
    months,
    installmentEur: getInterestFreeInstallment(totalEur, months),
    label: `${months}x ${formatEuro(getInterestFreeInstallment(totalEur, months))}`,
  }));
}

export function formatAnnualFinancingLabel(totalEur: number, terms: readonly number[] = ANNUAL_FINANCING_TERMS) {
  const options = formatAnnualFinancing(totalEur, terms)
    .map((option) => option.label)
    .join(" o ");

  return `Sin intereses: ${options}`;
}

export function getMinimumExtraStudentBlockPriceEur() {
  return Math.min(
    ...planOrder.map((planType) => planCatalog[planType].extraStudentBlocks.monthlyPriceEur)
  );
}

export function getSelectableSubscriptionAddons(planType: PlanType) {
  return (Object.entries(subscriptionAddonCatalog) as Array<[SubscriptionAddonCatalogKey, typeof subscriptionAddonCatalog[SubscriptionAddonCatalogKey]]>)
    .filter(([key, addon]) => {
      // Catalog-only addon shown in pricing docs, not selectable in self-serve checkout yet.
      if (!isSelectableSubscriptionAddonKey(key)) {
        return false;
      }

      if (addon.starterOnly && planType !== "starter") {
        return false;
      }

      return !planCatalog[planType].includedSubscriptionAddons.includes(key);
    })
    .map(([key, addon]) => ({ key, ...addon }));
}