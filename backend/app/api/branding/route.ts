import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { permissionService } from "@/lib/services/permissionService";
import { brandingService } from "@/lib/services/brandingService";
import { updateBrandingSchema } from "@/lib/validators/brandingSchemas";

function parseBoolean(input: FormDataEntryValue | null): boolean {
  if (typeof input !== "string") return false;
  return input === "1" || input.toLowerCase() === "true";
}

function parseMultipartPayload(formData: FormData) {
  const payload = {
    primary_color: typeof formData.get("primary_color") === "string" ? (formData.get("primary_color") as string) : undefined,
    secondary_color: typeof formData.get("secondary_color") === "string" ? (formData.get("secondary_color") as string) : undefined,
    accent_color: typeof formData.get("accent_color") === "string"
      ? ((formData.get("accent_color") as string).trim() || null)
      : undefined,
    font_family: typeof formData.get("font_family") === "string" ? (formData.get("font_family") as string) : undefined,
    style_variant: typeof formData.get("style_variant") === "string" ? (formData.get("style_variant") as string) : undefined,
    remove_logo: parseBoolean(formData.get("remove_logo")),
  };

  const logoEntry = formData.get("logo");
  const logoFile = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;

  return { payload, logoFile };
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

  try {
    const branding = await brandingService.getTenantBranding(auth.context.tenantId);
    return ok(branding, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load branding";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  if (!permissionService.canManageSettings({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  })) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const { payload, logoFile } = parseMultipartPayload(formData);
      const parsed = updateBrandingSchema.safeParse(payload);

      if (!parsed.success) {
        return fail(
          {
            code: "invalid_request",
            message: "Invalid branding payload",
            details: parsed.error.flatten(),
          },
          400,
          origin
        );
      }

      const branding = await brandingService.updateTenantBranding(auth.context.tenantId, parsed.data, logoFile);
      return ok(branding, 200, origin);
    }

    const raw = await request.json();
    // Normalise: empty string → null for nullable colour fields
    const body = {
      ...raw,
      accent_color: raw.accent_color === "" ? null : raw.accent_color,
    };
    const parsed = updateBrandingSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid branding payload",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const branding = await brandingService.updateTenantBranding(auth.context.tenantId, parsed.data);
    return ok(branding, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update branding";
    const status = message.toLowerCase().includes("unsupported") || message.toLowerCase().includes("max size") ? 400 : 500;
    return fail({ code: status === 400 ? "invalid_request" : "update_failed", message }, status, origin);
  }
}
