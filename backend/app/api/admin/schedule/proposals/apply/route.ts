import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { scheduleService } from "@/lib/services/scheduleService";
import { applyScheduleProposalSchema } from "@/lib/validators/scheduleProposalSchemas";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = applyScheduleProposalSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        {
          code: "invalid_request",
          message: "Invalid payload",
          details: parsed.error.flatten(),
        },
        400,
        origin
      );
    }

    const result = await scheduleService.saveScheduleBatch(auth.context.tenantId, {
      creates: parsed.data.creates,
      updates: [],
      deletes: [],
    });

    return ok(
      {
        proposalId: parsed.data.proposalId,
        result,
      },
      result.errors.length > 0 ? 207 : 200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply schedule proposal";
    return fail(
      {
        code: "proposal_apply_failed",
        message,
      },
      500,
      origin
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
