import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { renewalService } from "@/lib/services/renewalService";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const offerId = typeof body?.offerId === "string" ? body.offerId.trim() : "";
    const action  = body?.action === "confirm" || body?.action === "reject" ? body.action as "confirm" | "reject" : null;

    if (!offerId || !action) {
      return fail({ code: "invalid_request", message: "offerId and action (confirm|reject) are required" }, 400, origin);
    }

    const result = await renewalService.respondToOffer({ offerId, action });
    return ok(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar la respuesta";
    return fail({ code: "respond_failed", message }, 500, origin);
  }
}

// GET support for direct browser link clicks (confirm/reject links in email)
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const offerId = request.nextUrl.searchParams.get("offer") || "";
  const action  = request.nextUrl.searchParams.get("action");

  if (!offerId || (action !== "confirm" && action !== "reject")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const result = await renewalService.respondToOffer({ offerId, action });
    // Redirect to the frontend confirmation page with result in query
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
    const target = appUrl
      ? `${appUrl}/renovar?status=${result.status}`
      : `/renovar?status=${result.status}`;
    return NextResponse.redirect(new URL(target, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    return NextResponse.redirect(new URL(`/renovar?status=error&msg=${encodeURIComponent(message)}`, request.url));
  }
}
