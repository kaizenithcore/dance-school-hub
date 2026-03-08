import { Resend } from "resend";
import { getEnv } from "@/lib/env";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  sent: boolean;
  provider: "resend" | "noop";
  messageId?: string;
  error?: string;
}

function resolveSender() {
  return process.env.RESEND_FROM_EMAIL || "DanceHub <no-reply@dancehub.local>";
}

export const emailService = {
  async send(payload: EmailPayload): Promise<EmailResult> {
    const env = getEnv();

    if (!env.RESEND_API_KEY) {
      return {
        sent: true,
        provider: "noop",
      };
    }

    const resend = new Resend(env.RESEND_API_KEY);

    try {
      const response = await resend.emails.send({
        from: resolveSender(),
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      const messageId = typeof response.data?.id === "string" ? response.data.id : undefined;

      if (response.error) {
        return {
          sent: false,
          provider: "resend",
          error: response.error.message || "Unknown Resend error",
        };
      }

      return {
        sent: true,
        provider: "resend",
        messageId,
      };
    } catch (error) {
      return {
        sent: false,
        provider: "resend",
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  },
};
