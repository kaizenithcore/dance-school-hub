import { getEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { examSuiteFeatureService } from "@/lib/services/examSuiteFeatureService";
import { stripeService, type SubscriptionCheckoutLineItem } from "@/lib/services/stripeService";

export type ExamPlan = "core" | "lite" | "pro";
export type ExamPlanType = "exam_suit" | "starter" | "pro" | "enterprise";
export type ExamBillingCycle = "monthly" | "annual";
export type ExamFeature =
  | "sessions.create"
  | "enrollments.create"
  | "enrollments.read"
  | "evaluation.manage"
  | "results.read"
  | "certificates.generate"
  | "certificates.read"
  | "school_access.invite"
  | "analytics.read"
  | "notifications.trigger";

export const EXAM_FEATURES: ExamFeature[] = [
  "sessions.create",
  "enrollments.create",
  "enrollments.read",
  "evaluation.manage",
  "results.read",
  "certificates.generate",
  "certificates.read",
  "school_access.invite",
  "analytics.read",
  "notifications.trigger",
];

export interface ExamFeatureAccessInput {
  organizationId?: string | null;
  tenantId?: string | null;
  sessionId?: string | null;
}

interface ExamFeatureRule {
  requiredPlan: ExamPlan;
  title: string;
  description: string;
}

interface ExamPlanLimits {
  maxActiveSessions: number | null;
  maxEnrollmentsPerSession: number | null;
  maxCertificatesPerSession: number | null;
  maxSchoolsPerAssociation: number | null;
}

const EXAM_PLAN_LIMITS: Record<ExamPlan, ExamPlanLimits> = {
  lite: {
    maxActiveSessions: 3,
    maxEnrollmentsPerSession: 80,
    maxCertificatesPerSession: 120,
    maxSchoolsPerAssociation: 5,
  },
  core: {
    maxActiveSessions: 15,
    maxEnrollmentsPerSession: 400,
    maxCertificatesPerSession: 1200,
    maxSchoolsPerAssociation: 30,
  },
  pro: {
    maxActiveSessions: null,
    maxEnrollmentsPerSession: null,
    maxCertificatesPerSession: null,
    maxSchoolsPerAssociation: null,
  },
};

const EXAM_FEATURE_RULES: Record<ExamFeature, ExamFeatureRule> = {
  "sessions.create": {
    requiredPlan: "lite",
    title: "Create exam sessions",
    description: "Create new exam sessions within tenant or organization scope",
  },
  "enrollments.create": {
    requiredPlan: "lite",
    title: "Create enrollments",
    description: "Register candidates in exam sessions",
  },
  "enrollments.read": {
    requiredPlan: "core",
    title: "Read enrollments",
    description: "List and inspect enrollment records",
  },
  "evaluation.manage": {
    requiredPlan: "core",
    title: "Manage evaluations",
    description: "Configure rubrics, grading and evaluation flows",
  },
  "results.read": {
    requiredPlan: "core",
    title: "Read results",
    description: "Access and publish exam results",
  },
  "certificates.generate": {
    requiredPlan: "core",
    title: "Generate certificates",
    description: "Create digital certificates for approved results",
  },
  "certificates.read": {
    requiredPlan: "lite",
    title: "Read certificates",
    description: "View generated certificates",
  },
  "school_access.invite": {
    requiredPlan: "core",
    title: "Invite schools",
    description: "Invite additional schools to organization sessions",
  },
  "analytics.read": {
    requiredPlan: "core",
    title: "Advanced analytics",
    description: "Access pass rate, participation and conversion metrics",
  },
  "notifications.trigger": {
    requiredPlan: "core",
    title: "Trigger notifications",
    description: "Queue and process exam notification campaigns",
  },
};

interface ExamSessionScope {
  id: string;
  organization_id: string | null;
  school_id: string | null;
}

interface ExamSubscriptionRow {
  id: string;
  organization_id: string;
  plan_type: ExamPlanType;
  plan: ExamPlan;
  billing_cycle: ExamBillingCycle;
  active: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ManualSubscriptionRequestInput {
  organizationId: string;
  plan: ExamPlan;
  billingCycle: ExamBillingCycle;
  actorUserId: string;
  note?: string;
  origin?: string;
}

interface ResolvedExamPlan {
  source: "organization_subscription" | "tenant_settings";
  plan: ExamPlan;
  planType: ExamPlanType | "tenant_feature_flag";
  organizationId?: string;
  tenantId?: string;
  subscriptionId?: string;
}

interface PlanFeatureAvailability {
  allowed: boolean;
  blockedByPlan: ExamPlan | null;
}

interface FeatureMatrixRow {
  feature: ExamFeature;
  title: string;
  description: string;
  requiredPlan: ExamPlan;
  availabilityByPlan: Record<ExamPlan, PlanFeatureAvailability>;
}

function rankPlan(plan: ExamPlan): number {
  if (plan === "pro") {
    return 3;
  }

  if (plan === "core") {
    return 2;
  }

  return 1;
}

function ensurePlanSatisfies(requiredPlan: ExamPlan, actualPlan: ExamPlan): boolean {
  return rankPlan(actualPlan) >= rankPlan(requiredPlan);
}

function getRequiredPlanForFeature(feature: ExamFeature): ExamPlan {
  return EXAM_FEATURE_RULES[feature].requiredPlan;
}

function isFeatureAllowedForPlan(plan: ExamPlan, feature: ExamFeature): boolean {
  return ensurePlanSatisfies(getRequiredPlanForFeature(feature), plan);
}

function resolveEffectiveExamPlan(planType: ExamPlanType, subscriptionPlan: ExamPlan): ExamPlan {
  if (planType === "starter") {
    return "lite";
  }

  if (planType === "pro" || planType === "enterprise") {
    return "pro";
  }

  return subscriptionPlan;
}

function defaultAmountCentsForPlan(plan: ExamPlan, billingCycle: ExamBillingCycle): number {
  const monthly = plan === "pro" ? 14900 : plan === "core" ? 7900 : 3900;
  return billingCycle === "annual" ? monthly * 12 : monthly;
}

function intervalForCycle(billingCycle: ExamBillingCycle): "month" | "year" {
  return billingCycle === "annual" ? "year" : "month";
}

function resolvePlanPriceId(plan: ExamPlan, billingCycle: ExamBillingCycle): string | undefined {
  const env = getEnv();

  if (plan === "core" && billingCycle === "monthly") {
    return env.STRIPE_PRICE_EXAM_SUIT_CORE;
  }

  if (plan === "core" && billingCycle === "annual") {
    return env.STRIPE_PRICE_EXAM_SUIT_CORE_ANNUAL;
  }

  if (plan === "pro") {
    return undefined;
  }

  if (plan === "lite" && billingCycle === "monthly") {
    return env.STRIPE_PRICE_EXAM_SUIT_LITE;
  }

  return env.STRIPE_PRICE_EXAM_SUIT_LITE_ANNUAL;
}

async function getSessionScope(sessionId: string): Promise<ExamSessionScope> {
  const { data, error } = await supabaseAdmin
    .from("exam_sessions")
    .select("id, organization_id, school_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load exam session scope: ${error.message}`);
  }

  if (!data) {
    throw new Error("Exam session not found");
  }

  return data as ExamSessionScope;
}

async function getActiveOrganizationSubscription(organizationId: string): Promise<ExamSubscriptionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("exam_subscriptions")
    .select("id, organization_id, plan_type, plan, billing_cycle, active, stripe_customer_id, stripe_subscription_id, metadata, created_at")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve exam subscription: ${error.message}`);
  }

  return (data as ExamSubscriptionRow | null) || null;
}

async function requireOrganizationPlan(organizationId: string, requiredPlan: ExamPlan): Promise<ResolvedExamPlan> {
  const subscription = await getActiveOrganizationSubscription(organizationId);

  if (!subscription) {
    throw new Error("Exam subscription required for organization");
  }

  const effectivePlan = resolveEffectiveExamPlan(subscription.plan_type, subscription.plan);

  if (!ensurePlanSatisfies(requiredPlan, effectivePlan)) {
    throw new Error(`Exam plan '${requiredPlan}' is required`);
  }

  return {
    source: "organization_subscription",
    plan: effectivePlan,
    planType: subscription.plan_type,
    organizationId,
    subscriptionId: subscription.id,
  };
}

async function requireTenantPlan(tenantId: string, requiredPlan: ExamPlan): Promise<ResolvedExamPlan> {
  const enabled = await examSuiteFeatureService.isEnabledForTenant(tenantId);
  if (!enabled) {
    throw new Error("ExamSuite feature is not enabled for tenant");
  }

  // Tenant-scoped schools with ExamSuite enabled are treated as fully enabled.
  const tenantPlan: ExamPlan = "pro";
  if (!ensurePlanSatisfies(requiredPlan, tenantPlan)) {
    throw new Error(`Exam plan '${requiredPlan}' is required`);
  }

  return {
    source: "tenant_settings",
    tenantId,
    plan: tenantPlan,
    planType: "tenant_feature_flag",
  };
}

function toLimitExceededMessage(limitName: string, max: number, plan: ExamPlan): string {
  return `Exam plan limit exceeded: ${limitName} (${max}) for plan '${plan}'`;
}

async function countActiveSessionsByScope(input: { organizationId?: string | null; tenantId?: string | null }) {
  let query = supabaseAdmin
    .from("exam_sessions")
    .select("id", { count: "exact", head: true })
    .in("status", ["draft", "published", "enrollment_open", "closed", "evaluated"]);

  if (input.organizationId) {
    query = query.eq("organization_id", input.organizationId);
  } else if (input.tenantId) {
    query = query.eq("school_id", input.tenantId);
  } else {
    throw new Error("Unable to resolve Exam plan scope");
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(`Failed to count active exam sessions: ${error.message}`);
  }

  return count || 0;
}

async function countSessionEnrollments(sessionId: string) {
  const { count, error } = await supabaseAdmin
    .from("exam_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("exam_session_id", sessionId)
    .neq("status", "cancelled");

  if (error) {
    throw new Error(`Failed to count exam enrollments: ${error.message}`);
  }

  return count || 0;
}

async function countSessionCertificates(sessionId: string) {
  const { data: resultRows, error: resultsError } = await supabaseAdmin
    .from("exam_results")
    .select("id, exam_enrollments!inner(exam_session_id)")
    .eq("exam_enrollments.exam_session_id", sessionId);

  if (resultsError) {
    throw new Error(`Failed to resolve exam results for certificates: ${resultsError.message}`);
  }

  const resultIds = (resultRows || []).map((row) => String((row as { id: string }).id));
  if (resultIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabaseAdmin
    .from("exam_certificates")
    .select("id", { count: "exact", head: true })
    .in("result_id", resultIds);

  if (error) {
    throw new Error(`Failed to count exam certificates: ${error.message}`);
  }

  return count || 0;
}

async function countAssociationSchools(organizationId: string) {
  const { count, error } = await supabaseAdmin
    .from("exam_memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to count schools for association: ${error.message}`);
  }

  return count || 0;
}

export const examSubscriptionService = {
  getPlanLimits(plan: ExamPlan): ExamPlanLimits {
    return EXAM_PLAN_LIMITS[plan];
  },

  listFeatures(): ExamFeature[] {
    return [...EXAM_FEATURES];
  },

  getFeatureRule(feature: ExamFeature) {
    return EXAM_FEATURE_RULES[feature];
  },

  getPlanCapabilities(plan: ExamPlan) {
    const allowedFeatures = EXAM_FEATURES.filter((feature) => isFeatureAllowedForPlan(plan, feature));
    const blockedFeatures = EXAM_FEATURES.filter((feature) => !isFeatureAllowedForPlan(plan, feature));

    return {
      plan,
      limits: this.getPlanLimits(plan),
      allowedFeatures,
      blockedFeatures,
    };
  },

  getFeatureMatrix(): FeatureMatrixRow[] {
    return EXAM_FEATURES.map((feature) => {
      const rule = EXAM_FEATURE_RULES[feature];

      const availabilityByPlan = {
        lite: {
          allowed: isFeatureAllowedForPlan("lite", feature),
          blockedByPlan: isFeatureAllowedForPlan("lite", feature) ? null : rule.requiredPlan,
        },
        core: {
          allowed: isFeatureAllowedForPlan("core", feature),
          blockedByPlan: isFeatureAllowedForPlan("core", feature) ? null : rule.requiredPlan,
        },
        pro: {
          allowed: isFeatureAllowedForPlan("pro", feature),
          blockedByPlan: isFeatureAllowedForPlan("pro", feature) ? null : rule.requiredPlan,
        },
      } satisfies Record<ExamPlan, PlanFeatureAvailability>;

      return {
        feature,
        title: rule.title,
        description: rule.description,
        requiredPlan: rule.requiredPlan,
        availabilityByPlan,
      };
    });
  },

  async getOrganizationFeatureSummary(organizationId: string) {
    const subscription = await getActiveOrganizationSubscription(organizationId);
    if (!subscription) {
      return {
        organizationId,
        resolvedPlan: null as ExamPlan | null,
        planType: null as ExamPlanType | null,
        activeSubscription: false,
        allowedFeatures: [] as ExamFeature[],
        blockedFeatures: [...EXAM_FEATURES],
      };
    }

    const resolvedPlan = resolveEffectiveExamPlan(subscription.plan_type, subscription.plan);
    const capabilities = this.getPlanCapabilities(resolvedPlan);

    return {
      organizationId,
      resolvedPlan,
      planType: subscription.plan_type,
      activeSubscription: true,
      allowedFeatures: capabilities.allowedFeatures,
      blockedFeatures: capabilities.blockedFeatures,
      limits: capabilities.limits,
    };
  },

  async requireExamPlan(input: ExamFeatureAccessInput, requiredPlan: ExamPlan = "lite") {
    if (input.organizationId) {
      return requireOrganizationPlan(input.organizationId, requiredPlan);
    }

    if (input.tenantId) {
      return requireTenantPlan(input.tenantId, requiredPlan);
    }

    throw new Error("Unable to resolve Exam plan scope");
  },

  async requireExamPlanForSession(sessionId: string, requiredPlan: ExamPlan = "lite") {
    const session = await getSessionScope(sessionId);

    return this.requireExamPlan(
      {
        organizationId: session.organization_id,
        tenantId: session.school_id,
      },
      requiredPlan
    );
  },

  async canUseExamFeature(input: ExamFeatureAccessInput, feature: ExamFeature): Promise<{
    allowed: boolean;
    feature: ExamFeature;
    requiredPlan: ExamPlan;
    resolvedPlan: ExamPlan | null;
    scope: { organizationId: string | null; tenantId: string | null };
    reason: string | null;
  }> {
    const requiredPlan = getRequiredPlanForFeature(feature);

    let organizationId = input.organizationId ?? null;
    let tenantId = input.tenantId ?? null;

    if (input.sessionId) {
      const session = await getSessionScope(input.sessionId);
      organizationId = session.organization_id;
      tenantId = session.school_id;
    }

    if (!organizationId && !tenantId) {
      return {
        allowed: false,
        feature,
        requiredPlan,
        resolvedPlan: null,
        scope: { organizationId: null, tenantId: null },
        reason: "Unable to resolve Exam plan scope",
      };
    }

    try {
      const access = await this.requireExamPlan({ organizationId, tenantId }, requiredPlan);
      return {
        allowed: true,
        feature,
        requiredPlan,
        resolvedPlan: access.plan,
        scope: { organizationId, tenantId },
        reason: null,
      };
    } catch (error) {
      return {
        allowed: false,
        feature,
        requiredPlan,
        resolvedPlan: null,
        scope: { organizationId, tenantId },
        reason: error instanceof Error ? error.message : "Exam feature access denied",
      };
    }
  },

  async requireExamFeature(input: ExamFeatureAccessInput, feature: ExamFeature) {
    const access = await this.canUseExamFeature(input, feature);
    if (access.allowed) {
      return access;
    }

    throw new Error(access.reason || `Exam feature '${feature}' requires plan '${access.requiredPlan}'`);
  },

  async assertCanCreateSession(input: { organizationId?: string | null; tenantId?: string | null }) {
    await this.requireExamFeature(input, "sessions.create");
    const resolved = await this.requireExamPlan(input, "lite");
    const limits = this.getPlanLimits(resolved.plan);

    if (limits.maxActiveSessions === null) {
      return;
    }

    const activeSessions = await countActiveSessionsByScope(input);
    if (activeSessions >= limits.maxActiveSessions) {
      throw new Error(toLimitExceededMessage("max active sessions", limits.maxActiveSessions, resolved.plan));
    }
  },

  async assertCanCreateEnrollmentForSession(sessionId: string) {
    await this.requireExamFeature({ sessionId }, "enrollments.create");
    const resolved = await this.requireExamPlanForSession(sessionId, "lite");
    const limits = this.getPlanLimits(resolved.plan);

    if (limits.maxEnrollmentsPerSession === null) {
      return;
    }

    const enrollments = await countSessionEnrollments(sessionId);
    if (enrollments >= limits.maxEnrollmentsPerSession) {
      throw new Error(toLimitExceededMessage("max enrollments per session", limits.maxEnrollmentsPerSession, resolved.plan));
    }
  },

  async assertCanGenerateCertificateForSession(sessionId: string) {
    await this.requireExamFeature({ sessionId }, "certificates.generate");
    const resolved = await this.requireExamPlanForSession(sessionId, "core");
    const limits = this.getPlanLimits(resolved.plan);

    if (limits.maxCertificatesPerSession === null) {
      return;
    }

    const certificates = await countSessionCertificates(sessionId);
    if (certificates >= limits.maxCertificatesPerSession) {
      throw new Error(toLimitExceededMessage("max certificates per session", limits.maxCertificatesPerSession, resolved.plan));
    }
  },

  async assertCanAddSchoolToAssociation(organizationId: string) {
    await this.requireExamFeature({ organizationId }, "school_access.invite");
    const resolved = await this.requireExamPlan({ organizationId }, "core");
    const limits = this.getPlanLimits(resolved.plan);

    if (limits.maxSchoolsPerAssociation === null) {
      return;
    }

    const linkedSchools = await countAssociationSchools(organizationId);
    if (linkedSchools >= limits.maxSchoolsPerAssociation) {
      throw new Error(
        toLimitExceededMessage("max schools per association", limits.maxSchoolsPerAssociation, resolved.plan)
      );
    }
  },

  async getSubscriptionForOrganization(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from("exam_subscriptions")
      .select("id, organization_id, plan_type, plan, billing_cycle, active, stripe_customer_id, stripe_subscription_id, metadata, created_at")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load exam subscription: ${error.message}`);
    }

    return (data as ExamSubscriptionRow | null) || null;
  },

  async upsertSubscription(input: {
    organizationId: string;
    plan: ExamPlan;
    billingCycle: ExamBillingCycle;
    active: boolean;
    planType?: ExamPlanType;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const payload = {
      organization_id: input.organizationId,
      plan_type: input.planType || "exam_suit",
      plan: input.plan,
      billing_cycle: input.billingCycle,
      active: input.active,
      stripe_customer_id: input.stripeCustomerId || null,
      stripe_subscription_id: input.stripeSubscriptionId || null,
      metadata: input.metadata || {},
    };

    const { data, error } = await supabaseAdmin
      .from("exam_subscriptions")
      .upsert(payload, { onConflict: "organization_id" })
      .select("id, organization_id, plan_type, plan, billing_cycle, active, stripe_customer_id, stripe_subscription_id, metadata, created_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert exam subscription: ${error?.message || "unknown error"}`);
    }

    return data as ExamSubscriptionRow;
  },

  async createCheckoutSession(input: {
    organizationId: string;
    plan: ExamPlan;
    billingCycle: ExamBillingCycle;
    actorUserId: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const priceId = resolvePlanPriceId(input.plan, input.billingCycle);

    const lineItems: SubscriptionCheckoutLineItem[] = priceId
      ? [{ priceId, quantity: 1 }]
      : [
          {
            quantity: 1,
            currency: "eur",
            unitAmountCents: defaultAmountCentsForPlan(input.plan, input.billingCycle),
            productName: `ExamSuit ${input.plan} plan`,
            recurringInterval: intervalForCycle(input.billingCycle),
          },
        ];

    const session = await stripeService.createSubscriptionCheckoutSession({
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      customerEmail: input.customerEmail,
      metadata: {
        module: "examsuit",
        organizationId: input.organizationId,
        planType: "exam_suit",
        plan: input.plan,
        billingCycle: input.billingCycle,
        actorUserId: input.actorUserId,
      },
      lineItems,
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      usingPriceCatalog: Boolean(priceId),
    };
  },

  async createManualSubscriptionRequest(input: ManualSubscriptionRequestInput) {
    const nowIso = new Date().toISOString();
    const existing = await this.getSubscriptionForOrganization(input.organizationId);

    const existingMetadata = (existing?.metadata && typeof existing.metadata === "object")
      ? existing.metadata
      : {};

    const manualRequestId = crypto.randomUUID();
    const nextMetadata = {
      ...existingMetadata,
      billingProvider: "manual",
      manualRequest: {
        id: manualRequestId,
        status: "pending_review",
        requestedAt: nowIso,
        requestedBy: input.actorUserId,
        plan: input.plan,
        billingCycle: input.billingCycle,
        note: input.note || null,
        origin: input.origin || null,
      },
    };

    const subscription = await this.upsertSubscription({
      organizationId: input.organizationId,
      plan: input.plan,
      billingCycle: input.billingCycle,
      active: false,
      metadata: nextMetadata,
      stripeCustomerId: existing?.stripe_customer_id || null,
      stripeSubscriptionId: existing?.stripe_subscription_id || null,
      planType: existing?.plan_type || "exam_suit",
    });

    return {
      requestId: manualRequestId,
      status: "pending_review" as const,
      organizationId: input.organizationId,
      subscriptionId: subscription.id,
      plan: input.plan,
      billingCycle: input.billingCycle,
      active: subscription.active,
      message: "Manual billing request created. Backoffice approval is required to activate the plan.",
    };
  },
};

export async function requireExamPlan(
  input: {
    organizationId?: string | null;
    tenantId?: string | null;
  },
  requiredPlan: ExamPlan = "lite"
) {
  return examSubscriptionService.requireExamPlan(input, requiredPlan);
}
