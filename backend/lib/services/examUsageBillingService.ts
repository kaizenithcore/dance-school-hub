import { getEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { stripeService } from "@/lib/services/stripeService";

export type ExamUsageEventType = "session_created" | "enrollment_created" | "certificate_generated";

interface BillingMonthRange {
  startIso: string;
  endIso: string;
  month: string;
}

interface UsageEventRow {
  id: string;
  organization_id: string | null;
  school_id: string | null;
  event_type: ExamUsageEventType;
  entity_id: string;
  quantity: number;
  unit_price_cents: number;
  currency: string;
  occurred_at: string;
  checkout_session_id: string | null;
  billed_at: string | null;
}

const DEFAULT_USAGE_PRICES_CENTS: Record<ExamUsageEventType, number> = {
  session_created: 250,
  enrollment_created: 80,
  certificate_generated: 150,
};

function parseBillingMonth(month: string): BillingMonthRange {
  const normalized = month.trim();
  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    throw new Error("Invalid billing month format. Expected YYYY-MM");
  }

  const year = Number.parseInt(normalized.slice(0, 4), 10);
  const monthIndex = Number.parseInt(normalized.slice(5, 7), 10) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new Error("Invalid billing month");
  }

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    month: normalized,
  };
}

function currentBillingMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function resolveUnitPriceCents(eventType: ExamUsageEventType): number {
  const env = getEnv();

  if (eventType === "session_created") {
    return env.EXAM_USAGE_PRICE_SESSION_CREATED_CENTS ?? DEFAULT_USAGE_PRICES_CENTS.session_created;
  }

  if (eventType === "enrollment_created") {
    return env.EXAM_USAGE_PRICE_ENROLLMENT_CREATED_CENTS ?? DEFAULT_USAGE_PRICES_CENTS.enrollment_created;
  }

  return env.EXAM_USAGE_PRICE_CERTIFICATE_GENERATED_CENTS ?? DEFAULT_USAGE_PRICES_CENTS.certificate_generated;
}

function buildDescriptionForMonth(month: string): string {
  return `Certifier usage charges ${month}`;
}

async function loadUnbilledUsageEvents(organizationId: string, month: string): Promise<UsageEventRow[]> {
  const range = parseBillingMonth(month);

  const { data, error } = await supabaseAdmin
    .from("exam_usage_events")
    .select("id, organization_id, school_id, event_type, entity_id, quantity, unit_price_cents, currency, occurred_at, checkout_session_id, billed_at")
    .eq("organization_id", organizationId)
    .is("billed_at", null)
    .is("checkout_session_id", null)
    .gte("occurred_at", range.startIso)
    .lt("occurred_at", range.endIso)
    .order("occurred_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load unbilled exam usage events: ${error.message}`);
  }

  return (data || []) as UsageEventRow[];
}

export const examUsageBillingService = {
  getConfiguredUsagePricesCents() {
    return {
      session_created: resolveUnitPriceCents("session_created"),
      enrollment_created: resolveUnitPriceCents("enrollment_created"),
      certificate_generated: resolveUnitPriceCents("certificate_generated"),
    };
  },

  async trackUsageEvent(input: {
    eventType: ExamUsageEventType;
    entityId: string;
    organizationId?: string | null;
    schoolId?: string | null;
    quantity?: number;
    occurredAt?: string;
    metadata?: Record<string, unknown>;
  }) {
    const unitPriceCents = resolveUnitPriceCents(input.eventType);
    const quantity = Number.isFinite(input.quantity) ? Math.max(1, Math.floor(input.quantity || 1)) : 1;

    const payload = {
      organization_id: input.organizationId || null,
      school_id: input.schoolId || null,
      event_type: input.eventType,
      entity_id: input.entityId,
      quantity,
      unit_price_cents: unitPriceCents,
      currency: "eur",
      occurred_at: input.occurredAt || new Date().toISOString(),
      metadata: input.metadata || {},
    };

    const { error } = await supabaseAdmin
      .from("exam_usage_events")
      .upsert(payload, { onConflict: "event_type,entity_id", ignoreDuplicates: true });

    if (error) {
      throw new Error(`Failed to track exam usage event: ${error.message}`);
    }

    return payload;
  },

  async getUsageSummaryForOrganization(input: {
    organizationId: string;
    fromMonth?: string;
    toMonth?: string;
  }) {
    const fromMonth = input.fromMonth || `${new Date().getUTCFullYear()}-01`;
    const toMonth = input.toMonth || currentBillingMonth();
    const from = parseBillingMonth(fromMonth);
    const to = parseBillingMonth(toMonth);

    const { data, error } = await supabaseAdmin
      .from("exam_usage_events")
      .select("id, organization_id, school_id, event_type, entity_id, quantity, unit_price_cents, currency, occurred_at, checkout_session_id, billed_at")
      .eq("organization_id", input.organizationId)
      .gte("occurred_at", from.startIso)
      .lt("occurred_at", to.endIso)
      .order("occurred_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load exam usage summary: ${error.message}`);
    }

    const rows = (data || []) as UsageEventRow[];

    const totals = {
      session_created: { quantity: 0, amount_cents: 0 },
      enrollment_created: { quantity: 0, amount_cents: 0 },
      certificate_generated: { quantity: 0, amount_cents: 0 },
      all: { quantity: 0, amount_cents: 0, unbilled_amount_cents: 0 },
    };

    const byMonth = new Map<string, {
      month: string;
      session_created: { quantity: number; amount_cents: number };
      enrollment_created: { quantity: number; amount_cents: number };
      certificate_generated: { quantity: number; amount_cents: number };
      total_amount_cents: number;
      unbilled_amount_cents: number;
    }>();

    for (const row of rows) {
      const amount = Math.max(0, row.quantity) * Math.max(0, row.unit_price_cents);
      const month = row.occurred_at.slice(0, 7);

      totals[row.event_type].quantity += row.quantity;
      totals[row.event_type].amount_cents += amount;
      totals.all.quantity += row.quantity;
      totals.all.amount_cents += amount;
      if (!row.billed_at) {
        totals.all.unbilled_amount_cents += amount;
      }

      const current = byMonth.get(month) || {
        month,
        session_created: { quantity: 0, amount_cents: 0 },
        enrollment_created: { quantity: 0, amount_cents: 0 },
        certificate_generated: { quantity: 0, amount_cents: 0 },
        total_amount_cents: 0,
        unbilled_amount_cents: 0,
      };

      current[row.event_type].quantity += row.quantity;
      current[row.event_type].amount_cents += amount;
      current.total_amount_cents += amount;
      if (!row.billed_at) {
        current.unbilled_amount_cents += amount;
      }

      byMonth.set(month, current);
    }

    return {
      organization_id: input.organizationId,
      from_month: from.month,
      to_month: to.month,
      prices_cents: this.getConfiguredUsagePricesCents(),
      totals,
      months: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
    };
  },

  async createUsageCheckoutSession(input: {
    organizationId: string;
    month?: string;
    actorUserId: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const month = input.month || currentBillingMonth();
    const events = await loadUnbilledUsageEvents(input.organizationId, month);

    if (events.length === 0) {
      throw new Error("No unbilled Certifier usage found for selected month");
    }

    const amountCents = events.reduce((acc, row) => {
      return acc + Math.max(0, row.quantity) * Math.max(0, row.unit_price_cents);
    }, 0);

    if (amountCents <= 0) {
      throw new Error("Unbilled usage total is zero for selected month");
    }

    const session = await stripeService.createCheckoutSession({
      amountCents,
      currency: "eur",
      description: buildDescriptionForMonth(month),
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      metadata: {
        module: "certifier_usage",
        organizationId: input.organizationId,
        billingMonth: month,
        actorUserId: input.actorUserId,
      },
    });

    const eventIds = events.map((row) => row.id);
    const { error: markError } = await supabaseAdmin
      .from("exam_usage_events")
      .update({ checkout_session_id: session.id })
      .in("id", eventIds);

    if (markError) {
      throw new Error(`Failed to lock usage events for checkout: ${markError.message}`);
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      billingMonth: month,
      currency: "eur",
      amountCents,
      eventsCount: events.length,
    };
  },
};
