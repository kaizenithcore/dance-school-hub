import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export type CrmStatus = "new" | "contacted" | "active" | "at_risk" | "churned";

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  ownerEmail: string;
  // Billing
  planType: string;
  trialPaymentCompleted: boolean;
  trialExpiresAt: string | null;
  daysUntilTrialExpiry: number | null;
  // Usage
  activeStudents: number;
  maxStudents: number;
  usagePct: number;
  totalEnrollments: number;
  totalPaymentsCents: number;
  // Activity
  lastStudentAt: string | null;
  isNew: boolean; // created < 7 days ago
  // CRM
  crmStatus: CrmStatus;
  crmLastNote: string | null;
}

export interface TenantDetail extends TenantSummary {
  crmNotes: CrmNote[];
}

export interface CrmNote {
  id: string;
  tenantId: string;
  note: string | null;
  status: CrmStatus;
  createdAt: string;
  updatedAt: string;
}

const FREE_TRIAL_DAYS = 30;

export const platformAdminService = {

  async listAllTenants(): Promise<TenantSummary[]> {
    // 1. All tenants
    const { data: tenants, error: tenantsErr } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: false });
    if (tenantsErr) throw new Error(`Failed to load tenants: ${tenantsErr.message}`);

    if (!tenants || tenants.length === 0) return [];
    const tenantIds = tenants.map((t) => t.id as string);

    // 2. Owner emails — owner role membership + user_profiles join
    const { data: memberships } = await supabaseAdmin
      .from("tenant_memberships")
      .select("tenant_id, user_id, user_profiles(email)")
      .in("tenant_id", tenantIds)
      .eq("role", "owner")
      .eq("is_active", true);

    const ownerEmailByTenant = new Map<string, string>();
    (memberships || []).forEach((m) => {
      const profile = Array.isArray(m.user_profiles) ? m.user_profiles[0] : m.user_profiles;
      const email = (profile as { email?: string } | null)?.email || "";
      if (!ownerEmailByTenant.has(m.tenant_id as string)) {
        ownerEmailByTenant.set(m.tenant_id as string, email);
      }
    });

    // 3. School settings (billing)
    const { data: settings } = await supabaseAdmin
      .from("school_settings")
      .select("tenant_id, payment_config")
      .in("tenant_id", tenantIds);

    const settingsByTenant = new Map<string, Record<string, unknown>>();
    (settings || []).forEach((s) => settingsByTenant.set(s.tenant_id as string, asObject(s.payment_config)));

    // 4. Active student counts
    const { data: studentCounts } = await supabaseAdmin
      .from("students")
      .select("tenant_id")
      .in("tenant_id", tenantIds)
      .eq("status", "active");

    const studentCountByTenant = new Map<string, number>();
    (studentCounts || []).forEach((s) => {
      const tid = s.tenant_id as string;
      studentCountByTenant.set(tid, (studentCountByTenant.get(tid) || 0) + 1);
    });

    // 5. Enrollment counts
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("tenant_id")
      .in("tenant_id", tenantIds)
      .in("status", ["confirmed", "pending"]);

    const enrollCountByTenant = new Map<string, number>();
    (enrollments || []).forEach((e) => {
      const tid = e.tenant_id as string;
      enrollCountByTenant.set(tid, (enrollCountByTenant.get(tid) || 0) + 1);
    });

    // 6. Total payments amount
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("tenant_id, amount_cents")
      .in("tenant_id", tenantIds)
      .eq("status", "paid");

    const paymentsByTenant = new Map<string, number>();
    (payments || []).forEach((p) => {
      const tid = p.tenant_id as string;
      paymentsByTenant.set(tid, (paymentsByTenant.get(tid) || 0) + ((p.amount_cents as number) || 0));
    });

    // 7. Last student created_at
    const { data: lastStudents } = await supabaseAdmin
      .from("students")
      .select("tenant_id, created_at")
      .in("tenant_id", tenantIds)
      .order("created_at", { ascending: false });

    const lastStudentByTenant = new Map<string, string>();
    (lastStudents || []).forEach((s) => {
      if (!lastStudentByTenant.has(s.tenant_id as string)) {
        lastStudentByTenant.set(s.tenant_id as string, s.created_at as string);
      }
    });

    // 8. CRM notes (latest per tenant)
    const { data: crmNotes } = await supabaseAdmin
      .from("platform_crm_notes")
      .select("tenant_id, status, note, updated_at")
      .in("tenant_id", tenantIds)
      .order("updated_at", { ascending: false });

    const crmByTenant = new Map<string, { status: CrmStatus; note: string | null }>();
    (crmNotes || []).forEach((n) => {
      if (!crmByTenant.has(n.tenant_id as string)) {
        crmByTenant.set(n.tenant_id as string, {
          status: (n.status as CrmStatus) || "new",
          note: (n.note as string | null) || null,
        });
      }
    });

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return tenants.map((t) => {
      const tid = t.id as string;
      const paymentConfig = settingsByTenant.get(tid) || {};
      const billing = featureEntitlementsService.resolveFromPaymentConfig(paymentConfig);
      const trialCompleted = Boolean(paymentConfig.trialPaymentCompleted ?? paymentConfig.trial_payment_completed);
      const createdAt = t.created_at as string;
      const trialExpiresAt = new Date(new Date(createdAt).getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const msUntilExpiry = new Date(trialExpiresAt).getTime() - now;
      const daysUntilExpiry = trialCompleted ? null : Math.max(0, Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000)));

      const activeStudents = studentCountByTenant.get(tid) || 0;
      const maxStudents = billing.limits.maxActiveStudents || 200;
      const usagePct = maxStudents > 0 ? Math.round((activeStudents / maxStudents) * 100) : 0;

      const crm = crmByTenant.get(tid) ?? { status: "new" as CrmStatus, note: null };

      return {
        id: tid,
        name: t.name as string,
        slug: t.slug as string,
        createdAt,
        ownerEmail: ownerEmailByTenant.get(tid) || "",
        planType: billing.planType,
        trialPaymentCompleted: trialCompleted,
        trialExpiresAt,
        daysUntilTrialExpiry: daysUntilExpiry,
        activeStudents,
        maxStudents,
        usagePct,
        totalEnrollments: enrollCountByTenant.get(tid) || 0,
        totalPaymentsCents: paymentsByTenant.get(tid) || 0,
        lastStudentAt: lastStudentByTenant.get(tid) || null,
        isNew: now - new Date(createdAt).getTime() < sevenDaysMs,
        crmStatus: crm.status,
        crmLastNote: crm.note,
      };
    });
  },

  async getTenantDetail(tenantId: string): Promise<TenantDetail | null> {
    const all = await this.listAllTenants();
    const summary = all.find((t) => t.id === tenantId);
    if (!summary) return null;

    const { data: notes } = await supabaseAdmin
      .from("platform_crm_notes")
      .select("id, tenant_id, note, status, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });

    const crmNotes: CrmNote[] = (notes || []).map((n) => ({
      id: n.id as string,
      tenantId: n.tenant_id as string,
      note: (n.note as string | null) ?? null,
      status: (n.status as CrmStatus) || "new",
      createdAt: n.created_at as string,
      updatedAt: n.updated_at as string,
    }));

    return { ...summary, crmNotes };
  },

  async saveCrmNote(tenantId: string, note: string, status: CrmStatus): Promise<CrmNote> {
    const { data, error } = await supabaseAdmin
      .from("platform_crm_notes")
      .insert({ tenant_id: tenantId, note, status, updated_at: new Date().toISOString() })
      .select("id, tenant_id, note, status, created_at, updated_at")
      .single();

    if (error || !data) throw new Error(`Failed to save CRM note: ${error?.message}`);

    return {
      id: data.id as string,
      tenantId: data.tenant_id as string,
      note: (data.note as string | null) ?? null,
      status: (data.status as CrmStatus) || "new",
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  },

  async updateCrmStatus(tenantId: string, status: CrmStatus): Promise<void> {
    // Upsert: update the latest note's status or insert a status-only note
    const { data: latest } = await supabaseAdmin
      .from("platform_crm_notes")
      .select("id")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.id) {
      await supabaseAdmin
        .from("platform_crm_notes")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", latest.id);
    } else {
      await supabaseAdmin
        .from("platform_crm_notes")
        .insert({ tenant_id: tenantId, status, note: null });
    }
  },
};
