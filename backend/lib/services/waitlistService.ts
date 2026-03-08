import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";
import { outboxService } from "@/lib/services/outboxService";

interface WaitlistContactSnapshot {
  name: string;
  email: string;
  phone?: string;
}

interface WaitlistRow {
  id: string;
  tenant_id: string;
  class_id: string;
  status: "pending" | "offered" | "enrolled" | "expired" | "cancelled";
  priority: number;
  requested_at: string;
  offered_at: string | null;
  expires_at: string | null;
  contact_snapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface ClassRow {
  id: string;
  name: string;
  capacity: number;
}

interface EnrollmentCountRow {
  class_id: string;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toContactSnapshot(value: unknown): WaitlistContactSnapshot {
  const source = asObject(value);
  return {
    name: typeof source.name === "string" ? source.name : "Sin nombre",
    email: typeof source.email === "string" ? source.email : "",
    phone: typeof source.phone === "string" ? source.phone : undefined,
  };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function toExpiryHours(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.min(168, Math.floor(value)));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.min(168, parsed));
    }
  }
  return 24;
}

export const waitlistService = {
  async getTenantFeatureContext(tenantId: string) {
    const { data } = await supabaseAdmin
      .from("school_settings")
      .select("payment_config, enrollment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const paymentConfig = asObject(data?.payment_config);
    const enrollmentConfig = asObject(data?.enrollment_config);
    const waitlistConfig = asObject(enrollmentConfig.waitlist);

    const resolved = featureEntitlementsService.resolveFromPaymentConfig(paymentConfig);

    return {
      waitlistEnabled: resolved.features.waitlistAutomation,
      offerExpiryHours: toExpiryHours(waitlistConfig.offerExpiryHours),
    };
  },

  async enqueuePublicRequest(input: {
    tenantId: string;
    classId: string;
    sourceEnrollmentId?: string;
    contactSnapshot: WaitlistContactSnapshot;
    metadata?: Record<string, unknown>;
  }) {
    const normalizedEmail = normalizeEmail(input.contactSnapshot.email);
    if (!normalizedEmail) {
      throw new Error("Waitlist requires a valid email");
    }

    const { data: existing } = await supabaseAdmin
      .from("class_waitlist")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("class_id", input.classId)
      .in("status", ["pending", "offered"])
      .filter("contact_snapshot->>email", "eq", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return {
        waitlistId: existing.id,
        created: false,
      };
    }

    const { data, error } = await supabaseAdmin
      .from("class_waitlist")
      .insert({
        tenant_id: input.tenantId,
        class_id: input.classId,
        source_enrollment_id: input.sourceEnrollmentId ?? null,
        status: "pending",
        contact_snapshot: {
          ...input.contactSnapshot,
          email: normalizedEmail,
        },
        metadata: {
          source: "public_enroll",
          ...(input.metadata || {}),
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create waitlist request: ${error?.message || "Unknown error"}`);
    }

    return {
      waitlistId: data.id as string,
      created: true,
    };
  },

  async listByClass(tenantId: string, classId: string) {
    await this.processExpiredOffers(tenantId, classId);

    const { data: rows, error } = await supabaseAdmin
      .from("class_waitlist")
      .select("id, tenant_id, class_id, status, priority, requested_at, offered_at, expires_at, contact_snapshot, metadata")
      .eq("tenant_id", tenantId)
      .eq("class_id", classId)
      .order("priority", { ascending: true })
      .order("requested_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load waitlist entries: ${error.message}`);
    }

    return ((rows || []) as WaitlistRow[]).map((row, index) => {
      const contact = toContactSnapshot(row.contact_snapshot);
      return {
        id: row.id,
        position: index + 1,
        classId: row.class_id,
        status: row.status,
        requestedAt: row.requested_at,
        offeredAt: row.offered_at,
        expiresAt: row.expires_at,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      };
    });
  },

  async listClassQueues(tenantId: string) {
    await this.processExpiredOffers(tenantId);

    const { data: classes, error: classesError } = await supabaseAdmin
      .from("classes")
      .select("id, name, capacity")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("name", { ascending: true });

    if (classesError) {
      throw new Error(`Failed to load classes for waitlist: ${classesError.message}`);
    }

    const classRows = (classes || []) as ClassRow[];
    const classIds = classRows.map((item) => item.id);

    const { data: confirmed } = await supabaseAdmin
      .from("enrollments")
      .select("class_id")
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed")
      .in("class_id", classIds);

    const { data: waitlistRows } = await supabaseAdmin
      .from("class_waitlist")
      .select("class_id, status")
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "offered"])
      .in("class_id", classIds);

    const confirmedCounts = new Map<string, number>();
    ((confirmed || []) as EnrollmentCountRow[]).forEach((row) => {
      confirmedCounts.set(row.class_id, (confirmedCounts.get(row.class_id) || 0) + 1);
    });

    const waitlistCounts = new Map<string, { pending: number; offered: number }>();
    ((waitlistRows || []) as Array<{ class_id: string; status: string }>).forEach((row) => {
      const current = waitlistCounts.get(row.class_id) || { pending: 0, offered: 0 };
      if (row.status === "offered") {
        current.offered += 1;
      } else {
        current.pending += 1;
      }
      waitlistCounts.set(row.class_id, current);
    });

    return classRows.map((item) => {
      const queue = waitlistCounts.get(item.id) || { pending: 0, offered: 0 };
      return {
        classId: item.id,
        className: item.name,
        capacity: item.capacity,
        confirmedEnrollments: confirmedCounts.get(item.id) || 0,
        pendingWaitlist: queue.pending,
        offeredWaitlist: queue.offered,
      };
    });
  },

  async processExpiredOffers(tenantId: string, classId?: string) {
    const nowIso = new Date().toISOString();
    let query = supabaseAdmin
      .from("class_waitlist")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "offered")
      .lt("expires_at", nowIso);

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data: expiredRows, error: expiredError } = await query;
    if (expiredError) {
      throw new Error(`Failed to load expired offers: ${expiredError.message}`);
    }

    const expiredIds = (expiredRows || []).map((row) => row.id as string);
    if (expiredIds.length === 0) {
      return { expiredCount: 0 };
    }

    const { error: updateWaitlistError } = await supabaseAdmin
      .from("class_waitlist")
      .update({
        status: "pending",
        offered_at: null,
        expires_at: null,
      })
      .eq("tenant_id", tenantId)
      .in("id", expiredIds);

    if (updateWaitlistError) {
      throw new Error(`Failed to release expired waitlist rows: ${updateWaitlistError.message}`);
    }

    const { error: updateOffersError } = await supabaseAdmin
      .from("waitlist_offers")
      .update({
        status: "expired",
        responded_at: nowIso,
      })
      .eq("tenant_id", tenantId)
      .eq("status", "queued")
      .in("waitlist_id", expiredIds);

    if (updateOffersError) {
      throw new Error(`Failed to mark offers expired: ${updateOffersError.message}`);
    }

    return { expiredCount: expiredIds.length };
  },

  async offerNext(tenantId: string, actorUserId: string, classId: string) {
    await this.processExpiredOffers(tenantId, classId);

    const now = new Date();

    const { data: alreadyOffered } = await supabaseAdmin
      .from("class_waitlist")
      .select("id, expires_at")
      .eq("tenant_id", tenantId)
      .eq("class_id", classId)
      .eq("status", "offered")
      .order("offered_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (alreadyOffered?.id && alreadyOffered.expires_at && new Date(alreadyOffered.expires_at).getTime() > now.getTime()) {
      return {
        offered: false,
        reason: "already_offered",
      } as const;
    }

    const { data: nextRow, error: nextError } = await supabaseAdmin
      .from("class_waitlist")
      .select("id, contact_snapshot")
      .eq("tenant_id", tenantId)
      .eq("class_id", classId)
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .order("requested_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextError) {
      throw new Error(`Failed to read waitlist queue: ${nextError.message}`);
    }

    if (!nextRow?.id) {
      return {
        offered: false,
        reason: "empty_queue",
      } as const;
    }

    const context = await this.getTenantFeatureContext(tenantId);
    const expiresAt = new Date(now.getTime() + context.offerExpiryHours * 60 * 60 * 1000);

    const { data: classRow, error: classError } = await supabaseAdmin
      .from("classes")
      .select("name")
      .eq("tenant_id", tenantId)
      .eq("id", classId)
      .maybeSingle();

    if (classError) {
      throw new Error(`Failed to resolve class for offer: ${classError.message}`);
    }

    const contact = toContactSnapshot(nextRow.contact_snapshot);
    if (!contact.email) {
      throw new Error("Selected waitlist contact has no email");
    }

    const { error: updateError } = await supabaseAdmin
      .from("class_waitlist")
      .update({
        status: "offered",
        offered_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", nextRow.id);

    if (updateError) {
      throw new Error(`Failed to mark waitlist as offered: ${updateError.message}`);
    }

    const { data: offerRow, error: offerError } = await supabaseAdmin
      .from("waitlist_offers")
      .insert({
        tenant_id: tenantId,
        class_id: classId,
        waitlist_id: nextRow.id,
        status: "queued",
        offered_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        metadata: {
          email: contact.email,
        },
      })
      .select("id")
      .single();

    if (offerError || !offerRow) {
      throw new Error(`Failed to create waitlist offer: ${offerError?.message || "Unknown error"}`);
    }

    await outboxService.enqueueEmail({
      tenantId,
      actorUserId,
      template: "waitlist_offer_v1",
      to: contact.email,
      subject: `Plaza disponible: ${typeof classRow?.name === "string" ? classRow.name : "tu clase"}`,
      html: `<p>Hola ${contact.name},</p><p>Se ha liberado una plaza para <strong>${typeof classRow?.name === "string" ? classRow.name : "tu clase"}</strong>.</p><p>Tienes hasta el <strong>${expiresAt.toLocaleString()}</strong> para confirmar.</p>`,
      text: `Hola ${contact.name}. Se ha liberado una plaza para ${typeof classRow?.name === "string" ? classRow.name : "tu clase"}. Tienes hasta ${expiresAt.toLocaleString()} para confirmar.`,
      metadata: {
        kind: "waitlist_offer",
        waitlistId: nextRow.id,
        waitlistOfferId: offerRow.id,
        classId,
      },
    });

    await supabaseAdmin.from("audit_log").insert({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      action: "waitlist_offer_created",
      entity_type: "class_waitlist",
      entity_id: nextRow.id,
      metadata: {
        classId,
        waitlistOfferId: offerRow.id,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      offered: true,
      waitlistId: nextRow.id,
      waitlistOfferId: offerRow.id,
      recipient: {
        name: contact.name,
        email: contact.email,
      },
      expiresAt: expiresAt.toISOString(),
    } as const;
  },
};
