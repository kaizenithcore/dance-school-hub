import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_STARTER: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_STARTER_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_PRO: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_PRO_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ENTERPRISE: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ENTERPRISE_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ADDON_CUSTOM_DOMAIN: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ADDON_CUSTOM_DOMAIN_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ADDON_PRIORITY_SUPPORT: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ADDON_PRIORITY_SUPPORT_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ADDON_WAITLIST_AUTOMATION: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ADDON_WAITLIST_AUTOMATION_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ADDON_RENEWAL_AUTOMATION: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_ADDON_RENEWAL_AUTOMATION_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_BLOCK_STARTER: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_BLOCK_STARTER_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_BLOCK_PRO: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_BLOCK_PRO_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_BLOCK_ENTERPRISE: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_BLOCK_ENTERPRISE_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_EXAM_SUIT_CORE: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_EXAM_SUIT_CORE_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_EXAM_SUIT_LITE: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  STRIPE_PRICE_EXAM_SUIT_LITE_ANNUAL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  EXAM_USAGE_PRICE_SESSION_CREATED_CENTS: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        const parsed = Number.parseInt(trimmed, 10);
        return Number.isFinite(parsed) ? parsed : value;
      }

      return value;
    },
    z.number().int().min(0).optional()
  ),
  EXAM_USAGE_PRICE_ENROLLMENT_CREATED_CENTS: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        const parsed = Number.parseInt(trimmed, 10);
        return Number.isFinite(parsed) ? parsed : value;
      }

      return value;
    },
    z.number().int().min(0).optional()
  ),
  EXAM_USAGE_PRICE_CERTIFICATE_GENERATED_CENTS: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        const parsed = Number.parseInt(trimmed, 10);
        return Number.isFinite(parsed) ? parsed : value;
      }

      return value;
    },
    z.number().int().min(0).optional()
  ),
  RESEND_API_KEY: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  INTEGRATIONS_WEBHOOK_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url().optional()
  ),
  INTEGRATIONS_WEBHOOK_SECRET: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
