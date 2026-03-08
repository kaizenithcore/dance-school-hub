import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { communicationService } from "@/lib/services/communicationService";

function canManageCommunications(role: string) {
  return role === "owner" || role === "admin";
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!canManageCommunications(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const campaignId = request.nextUrl.searchParams.get("campaignId");
    if (campaignId) {
      const deliveries = await communicationService.listCampaignDeliveries(auth.context.tenantId, campaignId, 500);
      return ok(deliveries, 200, origin);
    }

    const campaigns = await communicationService.listCampaigns(auth.context.tenantId, 30);
    return ok(campaigns, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaigns";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  if (!canManageCommunications(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const body = await request.json();
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const audienceRaw = body?.audience && typeof body.audience === "object" ? body.audience : {};

    const audience = {
      type: audienceRaw.type === "class" || audienceRaw.type === "discipline" ? audienceRaw.type : "all",
      classId: typeof audienceRaw.classId === "string" ? audienceRaw.classId : undefined,
      disciplineId: typeof audienceRaw.disciplineId === "string" ? audienceRaw.disciplineId : undefined,
    } as const;
    const channel = body?.channel === "whatsapp_link" ? "whatsapp_link" : "email";

    if (!subject || !message) {
      return fail({ code: "invalid_request", message: "subject and message are required" }, 400, origin);
    }

    const previewOnly = body?.previewOnly === true;
    if (previewOnly) {
      const recipients = await communicationService.listRecipients(auth.context.tenantId, audience, channel);
      return ok({
        channel,
        recipientsCount: recipients.length,
        recipientsPreview: recipients.slice(0, 10),
      }, 200, origin);
    }

    const queued = await communicationService.queueCampaign({
      tenantId: auth.context.tenantId,
      actorUserId: auth.user.id,
      channel,
      audience,
      subject,
      message,
    });

    return ok(queued, 201, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to queue campaign";
    return fail({ code: "create_failed", message }, 500, origin);
  }
}
