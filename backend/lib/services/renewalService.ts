import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";
import { emailService } from "@/lib/services/emailService";
import { brandingService } from "@/lib/services/brandingService";

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

function buildRenewalEmailHtml(input: {
  studentName: string;
  schoolName: string;
  responseUrl: string;
  primaryColor: string;
  fromCourse: string;
  toCourse: string;
  classNames: string[];
  scheduleText?: string;
  scheduleUrl?: string;
  scheduleHtml?: string;
  expiresAt?: string | null;
}) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const expiresLabel = input.expiresAt
    ? new Date(input.expiresAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const classListHtml = input.classNames.length > 0
    ? `<ul style="margin:0 0 0 18px;padding:0;font-size:13px;color:#334155;">${input.classNames.map((cn) => `<li style="margin-bottom:4px;">${esc(cn)}</li>`).join("")}</ul>`
    : `<p style="margin:0;font-size:13px;color:#64748b;">Sin clases asociadas.</p>`;

  const hasSchedule = !!(input.scheduleHtml || input.scheduleText || input.scheduleUrl);
  const scheduleHtml = hasSchedule
    ? `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Horario del próximo curso</p>
        ${input.scheduleHtml ?? ""}
        ${(!input.scheduleHtml && input.scheduleText) ? `<p style="margin:0 0 8px;font-size:13px;color:#334155;white-space:pre-line;">${esc(input.scheduleText)}</p>` : ""}
        ${input.scheduleUrl ? `<a href="${esc(input.scheduleUrl)}" style="font-size:13px;color:#3b82f6;display:inline-block;margin-top:8px;">Ver horario completo →</a>` : ""}
      </div>`
    : "";

  return `<!doctype html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f1f5f9;color:#0f172a;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
  <!-- header -->
  <div style="background:${input.primaryColor};padding:20px 32px;display:flex;align-items:center;justify-content:space-between;">
    <p style="margin:0;font-size:18px;font-weight:700;color:#fff;">${esc(input.schoolName)}</p>
    <span style="background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">${esc(input.fromCourse)} → ${esc(input.toCourse)}</span>
  </div>
  <!-- body -->
  <div style="padding:28px 32px;">
    <p style="margin:0 0 6px;font-size:15px;">Hola <strong>${esc(input.studentName)}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;">
      Tu escuela ha abierto el proceso de renovación para el curso <strong>${esc(input.toCourse)}</strong>.
      Revisa tus clases y confirma o ajusta tu plaza antes de que termine el plazo.
    </p>

    <!-- classes -->
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">Tus clases actuales (${esc(input.fromCourse)})</p>
      ${classListHtml}
    </div>

    ${scheduleHtml}

    <!-- cta -->
    <div style="margin-top:28px;text-align:center;">
      <a href="${esc(input.responseUrl)}" style="display:inline-block;background:${input.primaryColor};color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;">Gestionar mi renovación →</a>
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Podrás elegir qué clases renovar y cuáles liberar.</p>
    </div>

    ${expiresLabel ? `<p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Plazo límite: <strong>${esc(expiresLabel)}</strong></p>` : ""}
  </div>
  <!-- footer -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;">
    <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">Este correo es de ${esc(input.schoolName)}. Si tienes dudas, contacta directamente con la escuela.</p>
  </div>
</div>
</body></html>`;
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
    fromCourse?: string;
    toCourse?: string;
    scheduleText?: string;
    scheduleUrl?: string;
  }) {
    if (!input.name.trim()) throw new Error("Campaign name is required");
    if (!isValidPeriod(input.fromPeriod) || !isValidPeriod(input.toPeriod)) {
      throw new Error("fromPeriod and toPeriod must follow YYYY-MM");
    }

    // Build classNameMap from ALL active classes — not period-filtered.
    // listClassIdsForPeriod was too restrictive: it only finds classes whose
    // class_schedule rows have effective_from in the current month, which is
    // rarely true for established schools whose schedules were created months ago.
    const { data: allClassRows, error: classRowsError } = await supabaseAdmin
      .from("classes")
      .select("id, name")
      .eq("tenant_id", input.tenantId)
      .eq("status", "active");

    if (classRowsError) throw new Error(`Failed to load classes: ${classRowsError.message}`);
    if (!allClassRows || allClassRows.length === 0) throw new Error("No active classes found for this tenant");

    const classNameMap: Record<string, string> = {};
    (allClassRows).forEach((c) => { classNameMap[c.id as string] = c.name as string; });

    // Get ALL confirmed enrollments — not filtered by period/class subset.
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, class_id, students(name, email)")
      .eq("tenant_id", input.tenantId)
      .eq("status", "confirmed");

    if (enrollmentsError) throw new Error(`Failed to load enrollments: ${enrollmentsError.message}`);

    const byStudent = new Map<string, { classIds: Set<string>; name: string; email: string }>();
    ((enrollments || []) as EnrollmentForRenewalRow[]).forEach((row) => {
      const studentId = row.student_id;
      const student = normalizeStudent(row.students);
      const current = byStudent.get(studentId) || { classIds: new Set<string>(), name: student.name, email: student.email };
      current.classIds.add(row.class_id);
      byStudent.set(studentId, current);
    });

    if (byStudent.size === 0) throw new Error("No confirmed enrollments found. Ensure students have confirmed enrollments before generating a renewal.");

    const campaignMeta = {
      fromCourse: input.fromCourse || input.fromPeriod,
      toCourse: input.toCourse || input.toPeriod,
      scheduleText: input.scheduleText || null,
      scheduleUrl: input.scheduleUrl || null,
      classNameMap,
    };

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
        metadata: campaignMeta,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Failed to create campaign: ${campaignError?.message || "Unknown error"}`);
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
        metadata: { studentName: info.name, studentEmail: info.email },
      };
    });

    const { error: offersError } = await supabaseAdmin.from("renewal_offers").insert(offerRows);
    if (offersError) throw new Error(`Failed to create offers: ${offersError.message}`);

    await supabaseAdmin.from("audit_log").insert({
      tenant_id: input.tenantId,
      actor_user_id: input.actorUserId,
      action: "renewal_campaign_created",
      entity_type: "renewal_campaign",
      entity_id: campaign.id as string,
      metadata: { fromPeriod: input.fromPeriod, toPeriod: input.toPeriod, offersCount: offerRows.length },
    });

    return { campaignId: campaign.id as string, offersCount: offerRows.length };
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

  async sendOfferEmails(input: {
    tenantId: string;
    campaignId: string;
    offerIds?: string[];
    scheduledAt?: string;
    scheduleText?: string;
    scheduleUrl?: string;
    scheduleHtml?: string;
  }): Promise<{ sent: number; failed: number; skipped: number; scheduledAt?: string }> {
    // Fetch campaign for course/schedule metadata
    const { data: campaignRow } = await supabaseAdmin
      .from("renewal_campaigns")
      .select("metadata, expires_at, name")
      .eq("tenant_id", input.tenantId)
      .eq("id", input.campaignId)
      .single();

    const campaignMeta = asObject(campaignRow?.metadata);

    // Merge any new schedule info passed from the modal
    const updatedMeta: Record<string, unknown> = {
      ...campaignMeta,
      ...(input.scheduleText !== undefined ? { scheduleText: input.scheduleText } : {}),
      ...(input.scheduleUrl  !== undefined ? { scheduleUrl:  input.scheduleUrl  } : {}),
      ...(input.scheduleHtml !== undefined ? { scheduleHtml: input.scheduleHtml } : {}),
    };

    // If scheduledAt: persist and return
    if (input.scheduledAt) {
      await supabaseAdmin
        .from("renewal_campaigns")
        .update({ metadata: { ...updatedMeta, emailScheduledAt: input.scheduledAt } })
        .eq("tenant_id", input.tenantId)
        .eq("id", input.campaignId);
      return { sent: 0, failed: 0, skipped: 0, scheduledAt: input.scheduledAt };
    }

    // Persist any schedule updates even for immediate sends
    if (input.scheduleText !== undefined || input.scheduleUrl !== undefined) {
      await supabaseAdmin
        .from("renewal_campaigns")
        .update({ metadata: updatedMeta })
        .eq("tenant_id", input.tenantId)
        .eq("id", input.campaignId);
    }

    // Load offers
    let query = supabaseAdmin
      .from("renewal_offers")
      .select("id, student_id, status, current_class_ids, metadata, students(name, email)")
      .eq("tenant_id", input.tenantId)
      .eq("campaign_id", input.campaignId);

    if (input.offerIds && input.offerIds.length > 0) {
      query = query.in("id", input.offerIds);
    } else {
      query = query.eq("status", "pending");
    }

    const { data: offers, error } = await query;
    if (error) throw new Error(`Failed to load offers: ${error.message}`);
    if (!offers || offers.length === 0) return { sent: 0, failed: 0, skipped: 0 };

    const branding = await brandingService.getTenantBranding(input.tenantId);
    const { data: tenant } = await supabaseAdmin.from("tenants").select("name").eq("id", input.tenantId).single();

    const schoolName = (tenant?.name as string | null) || "Tu escuela";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.nexa.es";
    const primaryColor = branding.primary_color || "#7C3AED";
    const classNameMap = (updatedMeta.classNameMap as Record<string, string> | undefined) || {};
    const fromCourse   = (updatedMeta.fromCourse   as string | undefined) || "";
    const toCourse     = (updatedMeta.toCourse     as string | undefined) || "";
    const scheduleText = (updatedMeta.scheduleText  as string | undefined) || "";
    const scheduleUrl  = (updatedMeta.scheduleUrl   as string | undefined) || "";
    const scheduleHtml = (updatedMeta.scheduleHtml  as string | undefined) || "";
    const expiresAt    = campaignRow?.expires_at as string | null | undefined;

    let sent = 0; let failed = 0; let skipped = 0;

    for (const offer of offers as (RenewalOfferRow & { current_class_ids: string[] })[]) {
      const student = normalizeStudent(offer.students);
      if (!student.email) { skipped++; continue; }

      const classNames = (offer.current_class_ids || [])
        .map((id: string) => classNameMap[id] || id)
        .filter(Boolean);

      const html = buildRenewalEmailHtml({
        studentName: student.name,
        schoolName,
        responseUrl: `${appUrl}/renovar?offer=${offer.id}`,
        primaryColor,
        fromCourse,
        toCourse,
        classNames,
        scheduleText: scheduleText || undefined,
        scheduleUrl: scheduleUrl || undefined,
        scheduleHtml: scheduleHtml || undefined,
        expiresAt,
      });

      const result = await emailService.send({
        to: student.email,
        subject: `${schoolName} — Renovación de plaza curso ${toCourse}`,
        html,
        text: `Hola ${student.name},\n\n${schoolName} ha abierto el proceso de renovación para el curso ${toCourse}.\n\nGestiona tu renovación: ${appUrl}/renovar?offer=${offer.id}`,
      });

      if (result.sent) {
        const meta = asObject(offer.metadata);
        await supabaseAdmin
          .from("renewal_offers")
          .update({ metadata: { ...meta, emailSentAt: new Date().toISOString(), emailMessageId: result.messageId } })
          .eq("tenant_id", input.tenantId)
          .eq("id", offer.id);
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed, skipped };
  },

  async getEmailPreviewHtml(tenantId: string, campaignId: string, opts?: { scheduleText?: string; scheduleUrl?: string; scheduleHtml?: string }): Promise<string> {
    const [{ data: campaignRow }, branding, { data: tenantRow }] = await Promise.all([
      supabaseAdmin.from("renewal_campaigns").select("metadata, expires_at").eq("tenant_id", tenantId).eq("id", campaignId).single(),
      brandingService.getTenantBranding(tenantId),
      supabaseAdmin.from("tenants").select("name").eq("id", tenantId).single(),
    ]);

    const campaignMeta = asObject(campaignRow?.metadata);
    const classNameMap = (campaignMeta.classNameMap as Record<string, string> | undefined) || {};
    const schoolName   = (tenantRow?.name as string | null) || "Tu escuela";
    const fromCourse   = (campaignMeta.fromCourse as string | undefined) || "Curso actual";
    const toCourse     = (campaignMeta.toCourse   as string | undefined) || "Próximo curso";
    const scheduleText = opts?.scheduleText ?? (campaignMeta.scheduleText as string | undefined) ?? "";
    const scheduleUrl  = opts?.scheduleUrl  ?? (campaignMeta.scheduleUrl  as string | undefined) ?? "";
    const scheduleHtml = opts?.scheduleHtml ?? (campaignMeta.scheduleHtml as string | undefined) ?? "";
    const expiresAt    = campaignRow?.expires_at as string | null | undefined;

    // Use a sample offer (first pending)
    const { data: sampleOffer } = await supabaseAdmin
      .from("renewal_offers")
      .select("id, current_class_ids, students(name, email)")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .eq("status", "pending")
      .limit(1)
      .single();

    const student = normalizeStudent((sampleOffer as { students: RenewalOfferRow["students"] } | null)?.students ?? null);
    const classNames = ((sampleOffer as { current_class_ids?: string[] } | null)?.current_class_ids || [])
      .map((id: string) => classNameMap[id] || id);

    return buildRenewalEmailHtml({
      studentName: student.name || "Alumno de ejemplo",
      schoolName,
      responseUrl: "#preview",
      primaryColor: branding.primary_color || "#7C3AED",
      fromCourse,
      toCourse,
      classNames: classNames.length > 0 ? classNames : ["Ballet clásico — Lunes 18:00h", "Contemporáneo — Miércoles 19:00h"],
      scheduleText: scheduleText || undefined,
      scheduleUrl: scheduleUrl || undefined,
      scheduleHtml: scheduleHtml || undefined,
      expiresAt,
    });
  },

  async getPublicOfferDetails(offerId: string): Promise<{
    studentName: string;
    schoolName: string;
    fromCourse: string;
    toCourse: string;
    classes: Array<{ id: string; name: string }>;
    expiresAt: string | null;
    status: string;
  }> {
    const { data: offer, error } = await supabaseAdmin
      .from("renewal_offers")
      .select("id, current_class_ids, proposed_class_ids, status, expires_at, campaign_id, students(name), renewal_campaigns(metadata, expires_at, tenant_id)")
      .eq("id", offerId)
      .single();

    if (error || !offer) throw new Error("Oferta no encontrada o enlace expirado.");

    const offerRow = offer as {
      id: string;
      current_class_ids: string[];
      proposed_class_ids: string[];
      status: string;
      expires_at: string | null;
      campaign_id: string;
      students: { name?: string | null } | Array<{ name?: string | null }> | null;
      renewal_campaigns: { metadata: Record<string, unknown>; expires_at: string | null; tenant_id: string } | null;
    };

    const studentName = normalizeStudent(offerRow.students).name;
    const campaignMeta = asObject(offerRow.renewal_campaigns?.metadata);
    const classNameMap = (campaignMeta.classNameMap as Record<string, string> | undefined) || {};
    const tenantId = offerRow.renewal_campaigns?.tenant_id as string;

    const classes = (offerRow.current_class_ids || []).map((id) => ({
      id,
      name: classNameMap[id] || "Clase",
    }));

    // Get school name
    const { data: tenantRow } = await supabaseAdmin.from("tenants").select("name").eq("id", tenantId).single();

    return {
      studentName,
      schoolName: (tenantRow?.name as string | null) || "Tu escuela",
      fromCourse: (campaignMeta.fromCourse as string | undefined) || "",
      toCourse: (campaignMeta.toCourse as string | undefined) || "",
      classes,
      expiresAt: offerRow.renewal_campaigns?.expires_at ?? offerRow.expires_at,
      status: offerRow.status,
    };
  },

  async respondToOffer(input: {
    offerId: string;
    action: "confirm" | "reject";
    selectedClassIds?: string[];
  }): Promise<{ studentName: string; status: string; confirmedClasses: string[]; releasedClasses: string[] }> {
    // Fetch offer to know all current classes
    const { data: offerRow, error: fetchErr } = await supabaseAdmin
      .from("renewal_offers")
      .select("id, status, current_class_ids, students(name), renewal_campaigns(metadata)")
      .eq("id", input.offerId)
      .single();

    if (fetchErr || !offerRow) throw new Error("No se pudo procesar tu respuesta. El enlace puede haber expirado.");

    const row = offerRow as {
      id: string;
      status: string;
      current_class_ids: string[];
      students: RenewalOfferRow["students"];
      renewal_campaigns: { metadata: Record<string, unknown> } | null;
    };

    const studentName = normalizeStudent(row.students).name;
    const allClassIds = row.current_class_ids || [];
    const classNameMap = asObject(row.renewal_campaigns?.metadata)?.classNameMap as Record<string, string> | undefined || {};

    let nextStatus: string;
    let confirmedIds: string[];

    if (input.action === "reject") {
      nextStatus = "released";
      confirmedIds = [];
    } else {
      // Partial: keep only selected classes (or all if none specified)
      confirmedIds = (input.selectedClassIds && input.selectedClassIds.length > 0)
        ? input.selectedClassIds.filter((id) => allClassIds.includes(id))
        : allClassIds;
      nextStatus = confirmedIds.length === allClassIds.length ? "confirmed" : "changed";
    }

    const releasedIds = allClassIds.filter((id) => !confirmedIds.includes(id));

    await supabaseAdmin
      .from("renewal_offers")
      .update({
        status: nextStatus,
        responded_at: new Date().toISOString(),
        proposed_class_ids: confirmedIds,
      })
      .eq("id", input.offerId);

    const confirmedClasses = confirmedIds.map((id) => classNameMap[id] || id);
    const releasedClasses  = releasedIds.map((id)  => classNameMap[id] || id);

    return { studentName, status: nextStatus, confirmedClasses, releasedClasses };
  },
};
