import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";
import { stripeService } from "@/lib/services/stripeService";

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export type CrmStatus = "new" | "contacted" | "active" | "at_risk" | "churned";

export interface ResourceUsage {
  students: number;
  enrollments: number;
  classes: number;
  payments: number;
  invoices: number;
  schedules: number;
  storageMb: number;
  totalRows: number;
}

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
  isSuspended: boolean;
  // Usage (students toward plan limit)
  activeStudents: number;
  maxStudents: number;
  usagePct: number;
  totalEnrollments: number;
  // Revenue to Nexa via Stripe
  stripeTotalCents: number;
  stripePaymentCount: number;
  // Activity
  lastStudentAt: string | null;
  isNew: boolean;
  // CRM
  crmStatus: CrmStatus;
  crmLastNote: string | null;
}

export interface TenantDetail extends TenantSummary {
  crmNotes: CrmNote[];
  resourceUsage: ResourceUsage;
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
    const { data: tenants, error: tenantsErr } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: false });
    if (tenantsErr) throw new Error(`Failed to load tenants: ${tenantsErr.message}`);
    if (!tenants || tenants.length === 0) return [];
    const tenantIds = tenants.map((t) => t.id as string);

    // Owner emails
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

    // School settings (billing + suspension)
    const { data: settings } = await supabaseAdmin
      .from("school_settings")
      .select("tenant_id, payment_config")
      .in("tenant_id", tenantIds);
    const settingsByTenant = new Map<string, Record<string, unknown>>();
    (settings || []).forEach((s) => settingsByTenant.set(s.tenant_id as string, asObject(s.payment_config)));

    // Active student counts
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

    // Enrollment counts
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

    // Last student created_at
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

    // CRM latest status per tenant
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

    // Stripe revenue per tenant (run in parallel but don't block on errors)
    const stripeRevByTenant = new Map<string, { totalCents: number; count: number }>();
    if (stripeService.isConfigured()) {
      const stripeResults = await Promise.allSettled(
        tenantIds.map((tid) => stripeService.getTotalRevenueByTenant(tid).then((r) => ({ tid, r })))
      );
      stripeResults.forEach((result) => {
        if (result.status === "fulfilled") {
          stripeRevByTenant.set(result.value.tid, {
            totalCents: result.value.r.totalCents,
            count: result.value.r.count,
          });
        }
      });
    }

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return tenants.map((t) => {
      const tid = t.id as string;
      const paymentConfig = settingsByTenant.get(tid) || {};
      const billing = featureEntitlementsService.resolveFromPaymentConfig(paymentConfig);
      const trialCompleted = Boolean(paymentConfig.trialPaymentCompleted ?? paymentConfig.trial_payment_completed);
      const isSuspended = Boolean(paymentConfig.suspended);
      const createdAt = t.created_at as string;
      const trialExpiresAt = new Date(new Date(createdAt).getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const msUntilExpiry = new Date(trialExpiresAt).getTime() - now;
      const daysUntilExpiry = trialCompleted ? null : Math.max(0, Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000)));
      const activeStudents = studentCountByTenant.get(tid) || 0;
      const maxStudents = billing.limits.maxActiveStudents || 200;
      const usagePct = maxStudents > 0 ? Math.round((activeStudents / maxStudents) * 100) : 0;
      const crm = crmByTenant.get(tid) ?? { status: "new" as CrmStatus, note: null };
      const stripeRev = stripeRevByTenant.get(tid) ?? { totalCents: 0, count: 0 };

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
        isSuspended,
        activeStudents,
        maxStudents,
        usagePct,
        totalEnrollments: enrollCountByTenant.get(tid) || 0,
        stripeTotalCents: stripeRev.totalCents,
        stripePaymentCount: stripeRev.count,
        lastStudentAt: lastStudentByTenant.get(tid) || null,
        isNew: now - new Date(createdAt).getTime() < sevenDaysMs,
        crmStatus: crm.status,
        crmLastNote: crm.note,
      };
    });
  },

  async getResourceUsage(tenantId: string): Promise<ResourceUsage> {
    // Count rows in key tables in parallel
    const tables = ["students", "enrollments", "classes", "payments", "monthly_invoices", "class_schedules"] as const;
    const counts = await Promise.all(
      tables.map((table) =>
        supabaseAdmin
          .from(table)
          .select("id", { head: true, count: "exact" })
          .eq("tenant_id", tenantId)
          .then(({ count }) => count ?? 0)
          .catch(() => 0)
      )
    );

    // Storage: list files in tenant-assets/{tenantId}/
    let storageMb = 0;
    try {
      const { data: storageFiles } = await supabaseAdmin.storage
        .from("tenant-assets")
        .list(tenantId, { limit: 1000 });
      const totalBytes = (storageFiles || []).reduce((sum, f) => sum + (f.metadata?.size ?? 0), 0);
      storageMb = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
    } catch { /* storage may not exist */ }

    return {
      students: counts[0],
      enrollments: counts[1],
      classes: counts[2],
      payments: counts[3],
      invoices: counts[4],
      schedules: counts[5],
      storageMb,
      totalRows: counts.reduce((a, b) => a + b, 0),
    };
  },

  async getTenantDetail(tenantId: string): Promise<TenantDetail | null> {
    const all = await this.listAllTenants();
    const summary = all.find((t) => t.id === tenantId);
    if (!summary) return null;

    const [notesResult, resourceUsage] = await Promise.all([
      supabaseAdmin
        .from("platform_crm_notes")
        .select("id, tenant_id, note, status, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false }),
      this.getResourceUsage(tenantId),
    ]);

    const crmNotes: CrmNote[] = (notesResult.data || []).map((n) => ({
      id: n.id as string,
      tenantId: n.tenant_id as string,
      note: (n.note as string | null) ?? null,
      status: (n.status as CrmStatus) || "new",
      createdAt: n.created_at as string,
      updatedAt: n.updated_at as string,
    }));

    return { ...summary, crmNotes, resourceUsage };
  },

  async setSuspended(tenantId: string, suspended: boolean): Promise<void> {
    const { data: current } = await supabaseAdmin
      .from("school_settings")
      .select("payment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const config = asObject(current?.payment_config);
    await supabaseAdmin
      .from("school_settings")
      .update({ payment_config: { ...config, suspended } })
      .eq("tenant_id", tenantId);
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
      await supabaseAdmin.from("platform_crm_notes").insert({ tenant_id: tenantId, status, note: null });
    }
  },
};
