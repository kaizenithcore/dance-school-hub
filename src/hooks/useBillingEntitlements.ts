import { useCallback, useEffect, useMemo, useState } from "react";
import { getSchoolSettings } from "@/lib/api/settings";
import { redirectToBillingCheckout } from "@/lib/api/stripe";
import { planCatalog } from "@/lib/commercialCatalog";

type PlanType = "starter" | "pro" | "enterprise";

interface BillingEntitlements {
  planType: PlanType;
  trialPaymentCompleted: boolean;
  trialPaymentCompletedAt: string | null;
  maxActiveStudents: number;
  includedActiveStudents: number;
  addons: {
    customDomain: boolean;
    prioritySupport: boolean;
    waitlistAutomation: boolean;
    renewalAutomation: boolean;
  };
  features: {
    waitlistAutomation: boolean;
    renewalAutomation: boolean;
    courseClone: boolean;
    massCommunicationEmail: boolean;
    examSuite: boolean;
  };
}

const DEFAULT_ENTITLEMENTS: BillingEntitlements = {
  planType: "starter",
  trialPaymentCompleted: false,
  trialPaymentCompletedAt: null,
  maxActiveStudents: planCatalog.starter.limits.includedActiveStudents,
  includedActiveStudents: planCatalog.starter.limits.includedActiveStudents,
  addons: {
    customDomain: false,
    prioritySupport: false,
    waitlistAutomation: false,
    renewalAutomation: false,
  },
  features: {
    waitlistAutomation: false,
    renewalAutomation: false,
    courseClone: false,
    massCommunicationEmail: false,
    examSuite: false,
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toPlanType(value: unknown): PlanType {
  if (value === "pro" || value === "enterprise") return value;
  return "starter";
}

function targetPlanForFeature(featureKey: keyof BillingEntitlements["features"]): PlanType {
  if (featureKey === "examSuite") return "pro";
  if (featureKey === "waitlistAutomation") return "pro";
  if (featureKey === "renewalAutomation") return "pro";
  if (featureKey === "courseClone") return "pro";
  if (featureKey === "massCommunicationEmail") return "pro";
  return "pro";
}

export function useBillingEntitlements() {
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingEntitlements>(DEFAULT_ENTITLEMENTS);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getSchoolSettings();
      const source = asRecord(settings?.billing);
      const features = asRecord(source.features);
      const limits = asRecord(source.limits);
      const addons = asRecord(source.addons);

      setBilling({
        planType: toPlanType(source.planType),
        trialPaymentCompleted: asBool(source.trialPaymentCompleted, false),
        trialPaymentCompletedAt: typeof source.trialPaymentCompletedAt === "string" ? source.trialPaymentCompletedAt : null,
        maxActiveStudents: Number(limits.maxActiveStudents ?? DEFAULT_ENTITLEMENTS.maxActiveStudents) || DEFAULT_ENTITLEMENTS.maxActiveStudents,
        includedActiveStudents: Number(limits.includedActiveStudents ?? DEFAULT_ENTITLEMENTS.includedActiveStudents) || DEFAULT_ENTITLEMENTS.includedActiveStudents,
        addons: {
          customDomain: asBool(addons.customDomain),
          prioritySupport: asBool(addons.prioritySupport),
          waitlistAutomation: asBool(addons.waitlistAutomation),
          renewalAutomation: asBool(addons.renewalAutomation),
        },
        features: {
          waitlistAutomation: asBool(features.waitlistAutomation),
          renewalAutomation: asBool(features.renewalAutomation),
          courseClone: asBool(features.courseClone),
          massCommunicationEmail: asBool(features.massCommunicationEmail),
          examSuite: asBool(features.examSuite || features.exam_suite || features.examsuite),
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startUpgrade = useCallback(
    async (featureKey: keyof BillingEntitlements["features"]) => {
      const suggestedPlan = targetPlanForFeature(featureKey);
      const planType: PlanType = billing.planType === "enterprise" ? "enterprise" : suggestedPlan;

      await redirectToBillingCheckout({
        planType,
        billingCycle: "annual",
        extraStudentBlocks: 0,
        addons: {
          customDomain: billing.addons.customDomain,
          prioritySupport: billing.addons.prioritySupport,
          waitlistAutomation: planType === "starter" ? billing.addons.waitlistAutomation : false,
          renewalAutomation: planType === "starter" ? billing.addons.renewalAutomation : false,
        },
      });
    },
    [billing]
  );

  const planLabel = useMemo(() => {
    if (billing.planType === "enterprise") return "Enterprise";
    if (billing.planType === "pro") return "Pro";
    return "Starter";
  }, [billing.planType]);

  return {
    loading,
    billing,
    planLabel,
    refresh,
    startUpgrade,
  };
}
