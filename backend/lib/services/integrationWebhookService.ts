import { createHmac } from "crypto";
import { getEnv } from "@/lib/env";

interface IntegrationWebhookPayload {
  event: string;
  tenantId?: string | null;
  occurredAt: string;
  data: Record<string, unknown>;
}

function signPayload(secret: string, raw: string): string {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export const integrationWebhookService = {
  async emit(input: IntegrationWebhookPayload): Promise<void> {
    const env = getEnv();
    if (!env.INTEGRATIONS_WEBHOOK_URL) {
      return;
    }

    const body = JSON.stringify(input);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (env.INTEGRATIONS_WEBHOOK_SECRET) {
      headers["x-dsh-signature"] = signPayload(env.INTEGRATIONS_WEBHOOK_SECRET, body);
    }

    try {
      await fetch(env.INTEGRATIONS_WEBHOOK_URL, {
        method: "POST",
        headers,
        body,
      });
    } catch {
      // Webhook delivery errors should never block core user flows.
    }
  },
};
