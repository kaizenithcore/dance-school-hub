import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";

function canEdit(role: string) {
  return role === "owner" || role === "admin";
}

interface PublicSchoolProfile {
  tagline?: string;
  description?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildResponsePayload(input: {
  tenantName: string;
  tenantSlug: string;
  profile: PublicSchoolProfile;
  paymentConfig: Record<string, unknown>;
  scheduleConfig: Record<string, unknown>;
  notificationConfig: Record<string, unknown>;
  securityConfig: Record<string, unknown>;
  planType: string;
  features: unknown;
}) {
  return {
    school: {
      name: input.tenantName,
      slug: input.tenantSlug,
      email: input.profile.email || "",
      phone: input.profile.phone || "",
      address: input.profile.address || "",
      city: input.profile.city || "",
      tagline: input.profile.tagline || "",
      description: input.profile.description || "",
      website: input.profile.website || "",
      instagram: input.profile.instagram || "",
      facebook: input.profile.facebook || "",
      tiktok: input.profile.tiktok || "",
    },
    payment: input.paymentConfig,
    schedule: input.scheduleConfig,
    notifications: input.notificationConfig,
    security: input.securityConfig,
    billing: {
      planType: input.planType,
      features: input.features,
    },
  };
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

  const tenantId = auth.context.tenantId;

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("name, slug")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) {
    return fail({ code: "not_found", message: "Tenant not found" }, 404, origin);
  }

  const { data: settings, error: settingsError } = await supabaseAdmin
    .from("school_settings")
    .select("enrollment_config, payment_config, schedule_config, notification_config")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (settingsError) {
    return fail({ code: "fetch_failed", message: settingsError.message }, 500, origin);
  }

  const enrollmentConfig = asObject(settings?.enrollment_config);
  const securityConfig = asObject(enrollmentConfig.security_config);
  const profileSource = asObject(enrollmentConfig.public_profile ?? enrollmentConfig.publicProfile);
  const paymentConfig = asObject(settings?.payment_config);
  const billing = featureEntitlementsService.resolveFromPaymentConfig(paymentConfig);
  const profile: PublicSchoolProfile = {
    tagline: asString(profileSource.tagline) || undefined,
    description: asString(profileSource.description) || undefined,
    address: asString(profileSource.address) || undefined,
    city: asString(profileSource.city) || undefined,
    phone: asString(profileSource.phone) || undefined,
    email: asString(profileSource.email) || undefined,
    website: asString(profileSource.website) || undefined,
    instagram: asString(profileSource.instagram) || undefined,
    facebook: asString(profileSource.facebook) || undefined,
    tiktok: asString(profileSource.tiktok) || undefined,
  };

  return ok(
    buildResponsePayload({
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      profile,
      paymentConfig,
      scheduleConfig: asObject(settings?.schedule_config),
      notificationConfig: asObject(settings?.notification_config),
      securityConfig,
      planType: billing.planType,
      features: billing.features,
    }),
    200,
    origin
  );
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!canEdit(auth.context.role)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  const tenantId = auth.context.tenantId;

  try {
    const body = await request.json();
    const school = asObject(body.school);
    const payment = asObject(body.payment);
    const schedule = asObject(body.schedule);
    const notifications = asObject(body.notifications);
    const security = asObject(body.security);
    const billing = asObject(body.billing);

    const name = asString(school.name);
    const slug = asString(school.slug);

    if (!name || !slug) {
      return fail({ code: "invalid_request", message: "school.name and school.slug are required" }, 400, origin);
    }

    const { error: tenantUpdateError } = await supabaseAdmin
      .from("tenants")
      .update({ name, slug })
      .eq("id", tenantId);

    if (tenantUpdateError) {
      const isUniqueError = tenantUpdateError.code === "23505";
      return fail(
        {
          code: isUniqueError ? "slug_conflict" : "update_failed",
          message: isUniqueError ? "El slug ya está en uso por otra escuela" : tenantUpdateError.message,
        },
        isUniqueError ? 409 : 500,
        origin
      );
    }

    const { data: existingSettings, error: existingSettingsError } = await supabaseAdmin
      .from("school_settings")
      .select("enrollment_config, payment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (existingSettingsError) {
      return fail({ code: "fetch_failed", message: existingSettingsError.message }, 500, origin);
    }

    const existingEnrollmentConfig = asObject(existingSettings?.enrollment_config);
    const existingPaymentConfig = asObject(existingSettings?.payment_config);
    const existingBillingConfig = asObject(existingPaymentConfig.billing ?? existingPaymentConfig.billing_config);
    const requestedPlanType = asString(billing.planType);
    const requestedFeatures = asObject(billing.features);
    const existingPlanType =
      asString(existingBillingConfig.planType)
      || asString(existingBillingConfig.plan_type)
      || asString(existingPaymentConfig.planType)
      || asString(existingPaymentConfig.plan_type)
      || "starter";
    const nextPlanType = requestedPlanType || existingPlanType;
    const existingResolvedBilling = featureEntitlementsService.resolveFromPaymentConfig(existingPaymentConfig);
    const nextPublicProfile: PublicSchoolProfile = {
      tagline: asString(school.tagline) || undefined,
      description: asString(school.description) || undefined,
      address: asString(school.address) || undefined,
      city: asString(school.city) || undefined,
      phone: asString(school.phone) || undefined,
      email: asString(school.email) || undefined,
      website: asString(school.website) || undefined,
      instagram: asString(school.instagram) || undefined,
      facebook: asString(school.facebook) || undefined,
      tiktok: asString(school.tiktok) || undefined,
    };

    const nextEnrollmentConfig: Record<string, unknown> = {
      ...existingEnrollmentConfig,
      public_profile: nextPublicProfile,
      security_config: {
        ...asObject(existingEnrollmentConfig.security_config),
        ...security,
      },
    };

    const nextPaymentConfig: Record<string, unknown> = {
      ...existingPaymentConfig,
      ...payment,
      billing: {
        ...existingBillingConfig,
        planType: nextPlanType,
      },
      features: {
        ...existingResolvedBilling.features,
        ...requestedFeatures,
      },
    };

    const resolvedBilling = featureEntitlementsService.resolveFromPaymentConfig(nextPaymentConfig);

    const { error: upsertError } = await supabaseAdmin
      .from("school_settings")
      .upsert(
        {
          tenant_id: tenantId,
          enrollment_config: nextEnrollmentConfig,
          payment_config: nextPaymentConfig,
          schedule_config: schedule,
          notification_config: notifications,
        },
        { onConflict: "tenant_id" }
      );

    if (upsertError) {
      return fail({ code: "update_failed", message: upsertError.message }, 500, origin);
    }

    return ok(
      buildResponsePayload({
        tenantName: name,
        tenantSlug: slug,
        profile: nextPublicProfile,
        paymentConfig: nextPaymentConfig,
        scheduleConfig: schedule,
        notificationConfig: notifications,
        securityConfig: asObject(nextEnrollmentConfig.security_config),
        planType: resolvedBilling.planType,
        features: resolvedBilling.features,
      }),
      200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return fail({ code: "update_failed", message }, 500, origin);
  }
}
