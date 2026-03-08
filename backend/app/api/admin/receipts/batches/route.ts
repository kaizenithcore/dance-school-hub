import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fail, ok } from "@/lib/http";
import { handleCorsPreFlight } from "@/lib/cors";
import { receiptService } from "@/lib/services/receiptService";

export const runtime = "nodejs";

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
    const batches = await receiptService.listBatches(auth.context.tenantId);
    return ok(batches, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch receipt batches";
    return fail({ code: "fetch_failed", message }, 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context || !auth.user) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const month = typeof body?.month === "string" ? body.month : undefined;

    const batch = await receiptService.createCashBatch(
      auth.context.tenantId,
      auth.user.id,
      month
    );

    return ok(
      {
        ...batch,
        downloadUrl: `/api/admin/receipts/batches/${batch.batchId}/download`,
      },
      201,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create receipt batch";
    const status = message.includes("Invalid month") ? 400 : 500;
    return fail({ code: "create_failed", message }, status, origin);
  }
}
