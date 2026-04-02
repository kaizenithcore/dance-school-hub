import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { outboxService } from "@/lib/services/outboxService";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";

export type AudienceType = "all" | "class" | "discipline";
export type CommunicationChannel = "email" | "whatsapp_link";

export interface CommunicationAudience {
  type: AudienceType;
  classId?: string;
  disciplineId?: string;
}

export interface QueueCommunicationInput {
  tenantId: string;
  actorUserId: string;
  channel: CommunicationChannel;
  audience: CommunicationAudience;
  subject: string;
  message: string;
}

interface Recipient {
  studentId: string;
  studentName: string;
  email?: string;
  phone?: string;
}

interface EnrollmentRecipientRow {
  student_id: string;
  students:
    | { name?: string | null; email?: string | null; phone?: string | null }
    | Array<{ name?: string | null; email?: string | null; phone?: string | null }>
    | null;
}

interface StudentRecipientRow {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface CampaignRow {
  id: string;
  created_at: string;
  channel: CommunicationChannel;
  audience_type: AudienceType;
  subject: string;
  status: "queued" | "processing" | "ready" | "sent" | "partial" | "failed";
  recipients_count: number;
  sent_count: number;
  failed_count: number;
}

interface DeliveryRow {
  id: string;
  campaign_id: string;
  recipient_student_id: string | null;
  recipient_name: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  status: "queued" | "processing" | "ready" | "sent" | "failed" | "skipped";
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  provider_payload: Record<string, unknown> | null;
  sent_at: string | null;
  created_at: string;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: unknown): string {
  const raw = normalizeText(value);
  if (!raw) return "";
  return raw.replace(/[^\d+]/g, "");
}

function buildWaLink(phone: string, message: string): string {
  const normalizedPhone = phone.replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${text}`;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function renderCampaignEmail(studentName: string, message: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <p>Hola ${studentName || "familia"},</p>
      <p style="white-space: pre-wrap;">${message}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b;">Mensaje enviado desde DanceHub.</p>
    </div>
  `;
}

function dedupeRecipients(rows: Recipient[], channel: CommunicationChannel): Recipient[] {
  const seen = new Set<string>();
  const unique: Recipient[] = [];

  for (const row of rows) {
    const key = channel === "email"
      ? normalizeText(row.email).toLowerCase()
      : normalizePhone(row.phone);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique;
}

async function recalculateCampaignStatus(tenantId: string, campaignId: string) {
  const { data, error } = await supabaseAdmin
    .from("message_deliveries")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("campaign_id", campaignId);

  if (error) {
    throw new Error(`Failed to recalculate campaign status: ${error.message}`);
  }

  const rows = data || [];
  const total = rows.length;
  const sent = rows.filter((row: any) => row.status === "sent").length;
  const failed = rows.filter((row: any) => row.status === "failed").length;
  const processing = rows.filter((row: any) => row.status === "processing").length;
  const queued = rows.filter((row: any) => row.status === "queued").length;
  const ready = rows.filter((row: any) => row.status === "ready").length;

  let nextStatus: CampaignRow["status"] = "queued";
  if (total === 0) {
    nextStatus = "sent";
  } else if (queued > 0 || processing > 0) {
    nextStatus = processing > 0 ? "processing" : "queued";
  } else if (ready > 0) {
    nextStatus = "ready";
  } else if (failed > 0 && sent > 0) {
    nextStatus = "partial";
  } else if (failed > 0 && sent === 0) {
    nextStatus = "failed";
  } else {
    nextStatus = "sent";
  }

  const { error: updateError } = await supabaseAdmin
    .from("message_campaigns")
    .update({
      status: nextStatus,
      recipients_count: total,
      sent_count: sent,
      failed_count: failed,
      ...(nextStatus === "sent" || nextStatus === "partial" || nextStatus === "failed" || nextStatus === "ready"
        ? { processed_at: new Date().toISOString() }
        : {}),
    })
    .eq("tenant_id", tenantId)
    .eq("id", campaignId);

  if (updateError) {
    throw new Error(`Failed to update campaign status: ${updateError.message}`);
  }
}

export const communicationService = {
  async isMassCommunicationEnabled(tenantId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("school_settings")
      .select("payment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve communication feature flags: ${error.message}`);
    }

    const resolved = featureEntitlementsService.resolveFromPaymentConfig(asObject(data?.payment_config));
    return resolved.features.massCommunicationEmail;
  },

  async listRecipients(
    tenantId: string,
    audience: CommunicationAudience,
    channel: CommunicationChannel = "email"
  ): Promise<Recipient[]> {
    if (audience.type === "class") {
      if (!audience.classId) {
        throw new Error("classId is required for class audience");
      }

      const { data, error } = await supabaseAdmin
        .from("enrollments")
        .select("student_id, students(name, email, phone)")
        .eq("tenant_id", tenantId)
        .eq("class_id", audience.classId)
        .eq("status", "confirmed");

      if (error) {
        throw new Error(`Failed to load class recipients: ${error.message}`);
      }

      const recipients = ((data || []) as EnrollmentRecipientRow[])
        .map((row) => {
          const student = Array.isArray(row.students) ? row.students[0] : row.students;

          const email = normalizeText(student?.email);
          const phone = normalizePhone(student?.phone);
          if (channel === "email" && !email) return null;
          if (channel === "whatsapp_link" && !phone) return null;

          return {
            studentId: row.student_id,
            studentName: normalizeText(student?.name) || "Alumno",
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          } satisfies Recipient;
        })
        .filter((item): item is Recipient => item !== null);

      return dedupeRecipients(recipients, channel);
    }

    if (audience.type === "discipline") {
      if (!audience.disciplineId) {
        throw new Error("disciplineId is required for discipline audience");
      }

      const { data, error } = await supabaseAdmin
        .from("enrollments")
        .select("student_id, students(name, email, phone), classes!inner(discipline_id)")
        .eq("tenant_id", tenantId)
        .eq("status", "confirmed")
        .eq("classes.discipline_id", audience.disciplineId);

      if (error) {
        throw new Error(`Failed to load discipline recipients: ${error.message}`);
      }

      const recipients = ((data || []) as EnrollmentRecipientRow[])
        .map((row) => {
          const student = Array.isArray(row.students) ? row.students[0] : row.students;
          const email = normalizeText(student?.email);
          const phone = normalizePhone(student?.phone);
          if (channel === "email" && !email) return null;
          if (channel === "whatsapp_link" && !phone) return null;

          return {
            studentId: row.student_id,
            studentName: normalizeText(student?.name) || "Alumno",
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          } satisfies Recipient;
        })
        .filter((item): item is Recipient => item !== null);

      return dedupeRecipients(recipients, channel);
    }

    const { data, error } = await supabaseAdmin
      .from("students")
      .select("id, name, email, phone")
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    if (error) {
      throw new Error(`Failed to load recipients: ${error.message}`);
    }

    const recipients = ((data || []) as StudentRecipientRow[])
      .map((student) => {
        const email = normalizeText(student.email);
        const phone = normalizePhone(student.phone);
        if (channel === "email" && !email) return null;
        if (channel === "whatsapp_link" && !phone) return null;

        return {
          studentId: student.id,
          studentName: normalizeText(student.name) || "Alumno",
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
        } satisfies Recipient;
      })
      .filter((item): item is Recipient => item !== null);

    return dedupeRecipients(recipients, channel);
  },

  async queueCampaign(input: QueueCommunicationInput) {
    const recipients = await this.listRecipients(input.tenantId, input.audience, input.channel);

    const subject = normalizeText(input.subject);
    const message = normalizeText(input.message);

    if (!subject || !message) {
      throw new Error("Subject and message are required");
    }

    const { data: campaignData, error: campaignError } = await supabaseAdmin
      .from("message_campaigns")
      .insert({
        tenant_id: input.tenantId,
        channel: input.channel,
        audience_type: input.audience.type,
        audience_class_id: input.audience.classId ?? null,
        audience_discipline_id: input.audience.disciplineId ?? null,
        subject,
        message,
        status: input.channel === "whatsapp_link" ? "ready" : "queued",
        recipients_count: recipients.length,
        created_by: input.actorUserId,
      })
      .select("id")
      .single();

    if (campaignError || !campaignData) {
      throw new Error(`Failed to create campaign: ${campaignError?.message || "Unknown error"}`);
    }

    const campaignId = campaignData.id as string;

    if (input.channel === "email") {
      const deliveryRows = recipients.map((recipient) => ({
        campaign_id: campaignId,
        tenant_id: input.tenantId,
        channel: "email",
        recipient_student_id: recipient.studentId,
        recipient_name: recipient.studentName,
        recipient_email: recipient.email,
        recipient_phone: null,
        status: "queued",
      }));

      const { data: deliveriesData, error: deliveriesError } = await supabaseAdmin
        .from("message_deliveries")
        .insert(deliveryRows)
        .select("id, recipient_email, recipient_name, recipient_student_id");

      if (deliveriesError) {
        throw new Error(`Failed to create deliveries: ${deliveriesError.message}`);
      }

      for (const delivery of deliveriesData || []) {
        await outboxService.enqueueEmail({
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          template: "campaign",
          to: String((delivery as any).recipient_email || ""),
          subject,
          html: renderCampaignEmail(String((delivery as any).recipient_name || "Alumno"), message),
          text: `Hola ${String((delivery as any).recipient_name || "Alumno")},\n\n${message}\n\nMensaje enviado desde DanceHub.`,
          metadata: {
            audience: input.audience,
            campaignId,
            deliveryId: (delivery as any).id,
            studentId: (delivery as any).recipient_student_id,
            studentName: (delivery as any).recipient_name,
            messageType: "campaign",
            channel: "email",
          },
        });
      }

      await recalculateCampaignStatus(input.tenantId, campaignId);
    } else {
      const deliveryRows = recipients.map((recipient) => {
        const text = `Hola ${recipient.studentName || "familia"},\n\n${message}\n\nMensaje enviado desde DanceHub.`;
        const waLink = buildWaLink(recipient.phone || "", text);
        return {
          campaign_id: campaignId,
          tenant_id: input.tenantId,
          channel: "whatsapp_link",
          recipient_student_id: recipient.studentId,
          recipient_name: recipient.studentName,
          recipient_email: recipient.email ?? null,
          recipient_phone: recipient.phone ?? null,
          status: "ready",
          provider_payload: {
            waLink,
            text,
          },
        };
      });

      const { error: deliveriesError } = await supabaseAdmin
        .from("message_deliveries")
        .insert(deliveryRows);

      if (deliveriesError) {
        throw new Error(`Failed to create WhatsApp deliveries: ${deliveriesError.message}`);
      }

      await recalculateCampaignStatus(input.tenantId, campaignId);
    }

    return {
      campaignId,
      channel: input.channel,
      queuedCount: recipients.length,
      recipients: recipients.slice(0, 20),
    };
  },

  async listCampaigns(tenantId: string, limit = 20) {
    const { data, error } = await supabaseAdmin
      .from("message_campaigns")
      .select("id, created_at, channel, audience_type, subject, status, recipients_count, sent_count, failed_count")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to load communication campaigns: ${error.message}`);
    }

    const campaigns = ((data || []) as CampaignRow[]).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      channel: row.channel,
      audience: { type: row.audience_type },
      subject: normalizeText(row.subject),
      status: row.status,
      queuedCount: row.recipients_count,
      sentCount: row.sent_count,
      failedCount: row.failed_count,
    }));

    return campaigns;
  },

  async listCampaignDeliveries(tenantId: string, campaignId: string, limit = 200) {
    const { data, error } = await supabaseAdmin
      .from("message_deliveries")
      .select("id, campaign_id, recipient_student_id, recipient_name, recipient_email, recipient_phone, status, provider, provider_message_id, error_message, provider_payload, sent_at, created_at")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to load delivery status: ${error.message}`);
    }

    return ((data || []) as DeliveryRow[]).map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      studentId: row.recipient_student_id,
      studentName: row.recipient_name,
      email: row.recipient_email,
      phone: row.recipient_phone,
      status: row.status,
      provider: row.provider,
      providerMessageId: row.provider_message_id,
      errorMessage: row.error_message,
      waLink: typeof row.provider_payload?.waLink === "string" ? row.provider_payload.waLink : undefined,
      sentAt: row.sent_at,
      createdAt: row.created_at,
    }));
  },

  async cancelQueuedDeliveries(tenantId: string, campaignId: string) {
    const { data, error } = await supabaseAdmin
      .from("message_deliveries")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .in("status", ["queued", "ready"]);

    if (error) {
      throw new Error(`Failed to load queued deliveries: ${error.message}`);
    }

    const deliveryIds = ((data || []) as Array<{ id: string }>).map((row) => row.id);
    if (deliveryIds.length === 0) {
      return { cancelledCount: 0, outboxCancelledCount: 0 };
    }

    const outboxCancelledCount = await outboxService.cancelQueuedEmailsByDeliveryIds(
      tenantId,
      deliveryIds,
      "Delivery cancelled by admin"
    );

    const { error: updateError } = await supabaseAdmin
      .from("message_deliveries")
      .update({
        status: "skipped",
        error_message: "Cancelled by admin",
      })
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .in("status", ["queued", "ready"]);

    if (updateError) {
      throw new Error(`Failed to cancel queued deliveries: ${updateError.message}`);
    }

    await recalculateCampaignStatus(tenantId, campaignId);

    return {
      cancelledCount: deliveryIds.length,
      outboxCancelledCount,
    };
  },

  async purgePendingDeliveriesForStudent(tenantId: string, studentId: string) {
    const { data, error } = await supabaseAdmin
      .from("message_deliveries")
      .select("id, campaign_id")
      .eq("tenant_id", tenantId)
      .eq("recipient_student_id", studentId)
      .in("status", ["queued", "ready"]);

    if (error) {
      throw new Error(`Failed to load student pending deliveries: ${error.message}`);
    }

    const rows = (data || []) as Array<{ id: string; campaign_id: string }>;
    if (rows.length === 0) {
      return { removedCount: 0, campaignsUpdated: 0 };
    }

    const deliveryIds = rows.map((row) => row.id);
    await outboxService.cancelQueuedEmailsByDeliveryIds(
      tenantId,
      deliveryIds,
      "Recipient deleted"
    );

    const { error: updateError } = await supabaseAdmin
      .from("message_deliveries")
      .update({
        status: "skipped",
        error_message: "Recipient deleted",
      })
      .eq("tenant_id", tenantId)
      .eq("recipient_student_id", studentId)
      .in("status", ["queued", "ready"]);

    if (updateError) {
      throw new Error(`Failed to purge student pending deliveries: ${updateError.message}`);
    }

    const campaignIds = Array.from(new Set(rows.map((row) => row.campaign_id).filter(Boolean)));
    for (const campaignId of campaignIds) {
      await recalculateCampaignStatus(tenantId, campaignId);
    }

    return {
      removedCount: deliveryIds.length,
      campaignsUpdated: campaignIds.length,
    };
  },

  async markDeliveryStatusFromQueue(input: {
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

    const { error } = await supabaseAdmin
      .from("message_deliveries")
      .update(patch)
      .eq("tenant_id", input.tenantId)
      .eq("campaign_id", input.campaignId)
      .eq("id", input.deliveryId);

    if (error) {
      throw new Error(`Failed to update delivery status: ${error.message}`);
    }

    await recalculateCampaignStatus(input.tenantId, input.campaignId);
  },
};
