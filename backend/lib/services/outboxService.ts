import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { emailService } from "@/lib/services/emailService";

export interface QueueEmailInput {
  tenantId: string;
  actorUserId: string;
  template: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

type OutboxStatus = "queued" | "processing" | "sent" | "failed";

interface OutboxMetadata {
  channel: "email";
  status: OutboxStatus;
  template: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  sentAt?: string;
  provider?: string;
  providerMessageId?: string;
  lastError?: string;
  context?: Record<string, unknown>;
}

interface CommunicationContext {
  campaignId?: string;
  deliveryId?: string;
}

interface OutboxRow {
  id: string;
  metadata: Record<string, unknown>;
}

function asOutboxMetadata(metadata: Record<string, unknown>): OutboxMetadata | null {
  if (metadata.channel !== "email") return null;
  if (typeof metadata.to !== "string") return null;
  if (typeof metadata.subject !== "string") return null;
  if (typeof metadata.html !== "string") return null;

  const status = typeof metadata.status === "string" ? metadata.status : "queued";
  if (status !== "queued" && status !== "processing" && status !== "sent" && status !== "failed") {
    return null;
  }

  return {
    channel: "email",
    status,
    template: typeof metadata.template === "string" ? metadata.template : "generic",
    to: metadata.to,
    subject: metadata.subject,
    html: metadata.html,
    text: typeof metadata.text === "string" ? metadata.text : undefined,
    attempts: typeof metadata.attempts === "number" ? metadata.attempts : 0,
    maxAttempts: typeof metadata.maxAttempts === "number" ? metadata.maxAttempts : 3,
    nextAttemptAt: typeof metadata.nextAttemptAt === "string" ? metadata.nextAttemptAt : new Date().toISOString(),
    sentAt: typeof metadata.sentAt === "string" ? metadata.sentAt : undefined,
    provider: typeof metadata.provider === "string" ? metadata.provider : undefined,
    providerMessageId: typeof metadata.providerMessageId === "string" ? metadata.providerMessageId : undefined,
    lastError: typeof metadata.lastError === "string" ? metadata.lastError : undefined,
    context: metadata.context && typeof metadata.context === "object"
      ? (metadata.context as Record<string, unknown>)
      : undefined,
  };
}

async function updateOutboxStatus(
  rowId: string,
  metadata: OutboxMetadata
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("audit_log")
    .update({ metadata })
    .eq("id", rowId);

  if (error) {
    throw new Error(`Failed to update outbox row ${rowId}: ${error.message}`);
  }
}

function withRetry(metadata: OutboxMetadata, error: string): OutboxMetadata {
  const attempts = metadata.attempts + 1;
  const canRetry = attempts < metadata.maxAttempts;
  const backoffMinutes = Math.min(30, attempts * 2);
  const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

  return {
    ...metadata,
    attempts,
    status: canRetry ? "queued" : "failed",
    nextAttemptAt: canRetry ? nextAttempt : metadata.nextAttemptAt,
    lastError: error,
  };
}

function readCommunicationContext(metadata: OutboxMetadata): CommunicationContext {
  const context = metadata.context;
  if (!context || typeof context !== "object") {
    return {};
  }

  const campaignId = typeof context.campaignId === "string" ? context.campaignId : undefined;
  const deliveryId = typeof context.deliveryId === "string" ? context.deliveryId : undefined;

  return { campaignId, deliveryId };
}

async function syncCampaignStats(tenantId: string, campaignId: string) {
  const { data, error } = await supabaseAdmin
    .from("message_deliveries")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("campaign_id", campaignId);

  if (error) {
    return;
  }

  const rows = data || [];
  const total = rows.length;
  const sent = rows.filter((row: any) => row.status === "sent").length;
  const failed = rows.filter((row: any) => row.status === "failed").length;
  const processing = rows.filter((row: any) => row.status === "processing").length;
  const queued = rows.filter((row: any) => row.status === "queued").length;
  const ready = rows.filter((row: any) => row.status === "ready").length;

  let status: "queued" | "processing" | "ready" | "sent" | "partial" | "failed" = "queued";
  if (total === 0) {
    status = "sent";
  } else if (queued > 0 || processing > 0) {
    status = processing > 0 ? "processing" : "queued";
  } else if (ready > 0) {
    status = "ready";
  } else if (failed > 0 && sent > 0) {
    status = "partial";
  } else if (failed > 0) {
    status = "failed";
  } else {
    status = "sent";
  }

  await supabaseAdmin
    .from("message_campaigns")
    .update({
      status,
      recipients_count: total,
      sent_count: sent,
      failed_count: failed,
      ...(status === "sent" || status === "partial" || status === "failed" || status === "ready"
        ? { processed_at: new Date().toISOString() }
        : {}),
    })
    .eq("tenant_id", tenantId)
    .eq("id", campaignId);
}

async function syncDeliveryStatus(input: {
  tenantId: string;
  campaignId?: string;
  deliveryId?: string;
  status: "processing" | "sent" | "failed";
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
}) {
  if (!input.campaignId || !input.deliveryId) {
    return;
  }

  const patch: Record<string, unknown> = {
    status: input.status,
    provider: input.provider ?? null,
    provider_message_id: input.providerMessageId ?? null,
    error_message: input.errorMessage ?? null,
  };

  if (input.status === "sent") {
    patch.sent_at = new Date().toISOString();
  }

  await supabaseAdmin
    .from("message_deliveries")
    .update(patch)
    .eq("tenant_id", input.tenantId)
    .eq("campaign_id", input.campaignId)
    .eq("id", input.deliveryId);

  await syncCampaignStats(input.tenantId, input.campaignId);
}

export const outboxService = {
  async enqueueEmail(input: QueueEmailInput) {
    const metadata: OutboxMetadata = {
      channel: "email",
      status: "queued",
      template: input.template,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attempts: 0,
      maxAttempts: 3,
      nextAttemptAt: new Date().toISOString(),
      context: input.metadata,
    };

    const { data, error } = await supabaseAdmin
      .from("audit_log")
      .insert({
        tenant_id: input.tenantId,
        actor_user_id: input.actorUserId,
        action: "outbox_email_queued",
        entity_type: "outbox_email",
        metadata,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to enqueue email: ${error?.message || "Unknown error"}`);
    }

    return data.id as string;
  },

  async tickTenantEmailQueue(tenantId: string, limit = 20) {
    const { data, error } = await supabaseAdmin
      .from("audit_log")
      .select("id, metadata")
      .eq("tenant_id", tenantId)
      .eq("action", "outbox_email_queued")
      .order("created_at", { ascending: true })
      .limit(Math.max(limit * 3, limit));

    if (error) {
      throw new Error(`Failed to load outbox queue: ${error.message}`);
    }

    const now = Date.now();
    const rows = ((data || []) as OutboxRow[])
      .map((row) => ({ row, outbox: asOutboxMetadata(row.metadata || {}) }))
      .filter((item) => item.outbox !== null)
      .filter((item) => {
        if (!item.outbox) return false;
        if (item.outbox.status !== "queued") return false;
        return new Date(item.outbox.nextAttemptAt).getTime() <= now;
      })
      .slice(0, limit);

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const item of rows) {
      if (!item.outbox) continue;

      const communicationContext = readCommunicationContext(item.outbox);

      processed += 1;

      const processingMeta: OutboxMetadata = {
        ...item.outbox,
        status: "processing",
      };

      await updateOutboxStatus(item.row.id, processingMeta);
      await syncDeliveryStatus({
        tenantId,
        campaignId: communicationContext.campaignId,
        deliveryId: communicationContext.deliveryId,
        status: "processing",
      });

      const result = await emailService.send({
        to: processingMeta.to,
        subject: processingMeta.subject,
        html: processingMeta.html,
        text: processingMeta.text,
      });

      if (result.sent) {
        await updateOutboxStatus(item.row.id, {
          ...processingMeta,
          status: "sent",
          sentAt: new Date().toISOString(),
          provider: result.provider,
          providerMessageId: result.messageId,
          attempts: processingMeta.attempts + 1,
          lastError: undefined,
        });
        await syncDeliveryStatus({
          tenantId,
          campaignId: communicationContext.campaignId,
          deliveryId: communicationContext.deliveryId,
          status: "sent",
          provider: result.provider,
          providerMessageId: result.messageId,
        });
        sent += 1;
      } else {
        await updateOutboxStatus(item.row.id, withRetry(processingMeta, result.error || "Unknown send error"));
        await syncDeliveryStatus({
          tenantId,
          campaignId: communicationContext.campaignId,
          deliveryId: communicationContext.deliveryId,
          status: "failed",
          provider: result.provider,
          errorMessage: result.error,
        });
        failed += 1;
      }
    }

    return {
      processed,
      sent,
      failed,
      remainingApprox: Math.max(0, ((data || []).length - processed)),
    };
  },

  async cancelQueuedEmailsByDeliveryIds(
    tenantId: string,
    deliveryIds: string[],
    reason = "Delivery cancelled"
  ): Promise<number> {
    const uniqueIds = Array.from(new Set(deliveryIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return 0;
    }

    const { data, error } = await supabaseAdmin
      .from("audit_log")
      .select("id, metadata")
      .eq("tenant_id", tenantId)
      .eq("action", "outbox_email_queued")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load outbox rows for cancellation: ${error.message}`);
    }

    const idsSet = new Set(uniqueIds);
    let cancelled = 0;

    for (const row of (data || []) as OutboxRow[]) {
      const metadata = asOutboxMetadata(row.metadata || {});
      if (!metadata) {
        continue;
      }

      if (metadata.status !== "queued") {
        continue;
      }

      const context = readCommunicationContext(metadata);
      if (!context.deliveryId || !idsSet.has(context.deliveryId)) {
        continue;
      }

      await updateOutboxStatus(row.id, {
        ...metadata,
        status: "failed",
        attempts: metadata.maxAttempts,
        lastError: reason,
      });
      cancelled += 1;
    }

    return cancelled;
  },
};
