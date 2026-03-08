import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";

interface RenewalCampaignRow {
  id: string;
  name: string;
  from_period: string;
  to_period: string;
  status: "draft" | "active" | "closed" | "cancelled";
  expires_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface RenewalOfferRow {
  id: string;
  campaign_id: string;
  student_id: string;
  current_class_ids: string[];
  proposed_class_ids: string[];
  status: "pending" | "confirmed" | "changed" | "released";
  expires_at: string | null;
  responded_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  students:
    | { name?: string | null; email?: string | null }
    | Array<{ name?: string | null; email?: string | null }>
    | null;
}

interface EnrollmentForRenewalRow {
  student_id: string;
  class_id: string;
  students:
    | { name?: string | null; email?: string | null }
    | Array<{ name?: string | null; email?: string | null }>
    | null;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeStudent(value: RenewalOfferRow["students"] | EnrollmentForRenewalRow["students"]) {
  if (!value) return { name: "Alumno", email: "" };
  const student = Array.isArray(value) ? value[0] : value;
  return {
    name: typeof student?.name === "string" && student.name.trim() ? student.name : "Alumno",
    email: typeof student?.email === "string" ? student.email : "",
  };
}

function isValidPeriod(period: string) {
  return /^\d{4}-\d{2}$/.test(period);
}

function periodStart(period: string) {
  if (!isValidPeriod(period)) {
    throw new Error("Invalid period format, expected YYYY-MM");
  }
  return `${period}-01`;
}

function periodNextStart(period: string) {
  const [yearRaw, monthRaw] = period.split("-");
  const year = Number.parseInt(yearRaw || "0", 10);
  const month = Number.parseInt(monthRaw || "0", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Invalid period format, expected YYYY-MM");
  }

  const date = new Date(Date.UTC(year, month, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

async function listClassIdsForPeriod(tenantId: string, period: string) {
  const start = periodStart(period);
  const end = periodNextStart(period);

  const { data: schedules, error: schedulesError } = await supabaseAdmin
    .from("class_schedules")
    .select("class_id")
    .eq("tenant_id", tenantId)
    .gte("effective_from", start)
    .lt("effective_from", end);

  if (schedulesError) {
    throw new Error(`Failed to load period schedules: ${schedulesError.message}`);
  }

  const classIds = Array.from(new Set((schedules || []).map((row) => row.class_id as string)));
  if (classIds.length > 0) {
    return classIds;
  }

  const { data: classesFallback, error: classesFallbackError } = await supabaseAdmin
    .from("classes")
    .select("id")
    .eq("tenant_id", tenantId)
    .gte("created_at", `${start}T00:00:00.000Z`)
    .lt("created_at", `${end}T00:00:00.000Z`);

  if (classesFallbackError) {
    throw new Error(`Failed to load fallback period classes: ${classesFallbackError.message}`);
  }

  return Array.from(new Set((classesFallback || []).map((row) => row.id as string)));
}

export const renewalService = {
  async isRenewalEnabled(tenantId: string) {
    const { data } = await supabaseAdmin
      .from("school_settings")
      .select("payment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const resolved = featureEntitlementsService.resolveFromPaymentConfig(asObject(data?.payment_config));
    return resolved.features.renewalAutomation;
  },

  async listCampaigns(tenantId: string) {
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from("renewal_campaigns")
      .select("id, name, from_period, to_period, status, expires_at, created_at, metadata")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (campaignsError) {
      throw new Error(`Failed to load renewal campaigns: ${campaignsError.message}`);
    }

    const { data: offers, error: offersError } = await supabaseAdmin
      .from("renewal_offers")
      .select("campaign_id, status")
      .eq("tenant_id", tenantId);

    if (offersError) {
      throw new Error(`Failed to load renewal offers: ${offersError.message}`);
    }

    const countsMap = new Map<
      string,
      { pending: number; confirmed: number; changed: number; released: number; total: number }
    >();

    (offers || []).forEach((row) => {
      const campaignId = row.campaign_id as string;
      const status = row.status as "pending" | "confirmed" | "changed" | "released";
      const current = countsMap.get(campaignId) || {
        pending: 0,
        confirmed: 0,
        changed: 0,
        released: 0,
        total: 0,
      };
      current.total += 1;
      if (status === "pending") current.pending += 1;
      if (status === "confirmed") current.confirmed += 1;
      if (status === "changed") current.changed += 1;
      if (status === "released") current.released += 1;
      countsMap.set(campaignId, current);
    });

    return ((campaigns || []) as RenewalCampaignRow[]).map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      fromPeriod: campaign.from_period,
      toPeriod: campaign.to_period,
      status: campaign.status,
      expiresAt: campaign.expires_at,
      createdAt: campaign.created_at,
      metadata: campaign.metadata || {},
      counts: countsMap.get(campaign.id) || {
        pending: 0,
        confirmed: 0,
        changed: 0,
        released: 0,
        total: 0,
      },
    }));
  },

  async listOffersByCampaign(
    tenantId: string,
    campaignId: string,
    status?: "pending" | "confirmed" | "changed" | "released"
  ) {
    let query = supabaseAdmin
      .from("renewal_offers")
      .select(
        "id, campaign_id, student_id, current_class_ids, proposed_class_ids, status, expires_at, responded_at, created_at, metadata, students(name, email)"
      )
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load renewal offers: ${error.message}`);
    }

    return ((data || []) as RenewalOfferRow[]).map((offer) => {
      const student = normalizeStudent(offer.students);
      return {
        id: offer.id,
        campaignId: offer.campaign_id,
        studentId: offer.student_id,
        studentName: student.name,
        studentEmail: student.email,
        currentClassIds: offer.current_class_ids || [],
        proposedClassIds: offer.proposed_class_ids || [],
        status: offer.status,
        expiresAt: offer.expires_at,
        respondedAt: offer.responded_at,
        createdAt: offer.created_at,
        metadata: offer.metadata || {},
      };
    });
  },

  async createCampaign(input: {
    tenantId: string;
    actorUserId: string;
    name: string;
    fromPeriod: string;
    toPeriod: string;
    expiresAt?: string;
  }) {
    if (!input.name.trim()) {
      throw new Error("Campaign name is required");
    }
    if (!isValidPeriod(input.fromPeriod) || !isValidPeriod(input.toPeriod)) {
      throw new Error("fromPeriod and toPeriod must follow YYYY-MM");
    }

    const classIds = await listClassIdsForPeriod(input.tenantId, input.fromPeriod);
    if (classIds.length === 0) {
      throw new Error("No classes found in source period");
    }

    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, class_id, students(name, email)")
      .eq("tenant_id", input.tenantId)
      .eq("status", "confirmed")
      .in("class_id", classIds);

    if (enrollmentsError) {
      throw new Error(`Failed to load enrollments for campaign: ${enrollmentsError.message}`);
    }

    const byStudent = new Map<string, { classIds: Set<string>; name: string; email: string }>();
    ((enrollments || []) as EnrollmentForRenewalRow[]).forEach((row) => {
      const studentId = row.student_id;
      const student = normalizeStudent(row.students);
      const current = byStudent.get(studentId) || {
        classIds: new Set<string>(),
        name: student.name,
        email: student.email,
      };
      current.classIds.add(row.class_id);
      byStudent.set(studentId, current);
    });

    if (byStudent.size === 0) {
      throw new Error("No confirmed enrollments found for this period");
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("renewal_campaigns")
      .insert({
        tenant_id: input.tenantId,
        name: input.name.trim(),
        from_period: input.fromPeriod,
        to_period: input.toPeriod,
        status: "active",
        expires_at: input.expiresAt || null,
        created_by: input.actorUserId,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Failed to create renewal campaign: ${campaignError?.message || "Unknown error"}`);
    }

    const offerRows = Array.from(byStudent.entries()).map(([studentId, info]) => {
      const classIdList = Array.from(info.classIds);
      return {
        tenant_id: input.tenantId,
        campaign_id: campaign.id as string,
        student_id: studentId,
        current_class_ids: classIdList,
        proposed_class_ids: classIdList,
        status: "pending",
        expires_at: input.expiresAt || null,
        metadata: {
          studentName: info.name,
          studentEmail: info.email,
        },
      };
    });

    const { error: offersError } = await supabaseAdmin.from("renewal_offers").insert(offerRows);

    if (offersError) {
      throw new Error(`Failed to create renewal offers: ${offersError.message}`);
    }

    await supabaseAdmin.from("audit_log").insert({
      tenant_id: input.tenantId,
      actor_user_id: input.actorUserId,
      action: "renewal_campaign_created",
      entity_type: "renewal_campaign",
      entity_id: campaign.id as string,
      metadata: {
        fromPeriod: input.fromPeriod,
        toPeriod: input.toPeriod,
        offersCount: offerRows.length,
      },
    });

    return {
      campaignId: campaign.id as string,
      offersCount: offerRows.length,
    };
  },

  async updateOfferStatus(input: {
    tenantId: string;
    actorUserId: string;
    campaignId: string;
    offerId: string;
    action: "confirm" | "change" | "release";
    proposedClassIds?: string[];
  }) {
    const nextStatus =
      input.action === "confirm"
        ? "confirmed"
        : input.action === "change"
          ? "changed"
          : "released";

    const payload: Record<string, unknown> = {
      status: nextStatus,
      responded_at: new Date().toISOString(),
    };

    if (input.action === "change" && Array.isArray(input.proposedClassIds) && input.proposedClassIds.length > 0) {
      payload.proposed_class_ids = input.proposedClassIds;
    }

    const { data, error } = await supabaseAdmin
      .from("renewal_offers")
      .update(payload)
      .eq("tenant_id", input.tenantId)
      .eq("campaign_id", input.campaignId)
      .eq("id", input.offerId)
      .select("id, status")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update renewal offer: ${error?.message || "Unknown error"}`);
    }

    await supabaseAdmin.from("audit_log").insert({
      tenant_id: input.tenantId,
      actor_user_id: input.actorUserId,
      action: "renewal_offer_updated",
      entity_type: "renewal_offer",
      entity_id: input.offerId,
      metadata: {
        campaignId: input.campaignId,
        action: input.action,
        status: data.status,
      },
    });

    return {
      id: data.id as string,
      status: data.status as "pending" | "confirmed" | "changed" | "released",
    };
  },
};
