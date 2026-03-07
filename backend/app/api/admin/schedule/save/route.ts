import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { scheduleService } from "@/lib/services/scheduleService";
import { batchScheduleOperationSchema } from "@/lib/validators/scheduleSchemas";

/**
 * POST /api/admin/schedule/save
 * 
 * Batch save operation for schedules
 * Allows creating, updating, and deleting multiple schedules in a single request
 * 
 * Validates all operations and checks for conflicts before committing any changes
 * 
 * Request body:
 * {
 *   "creates": [
 *     {
 *       "classId": "uuid",
 *       "roomId": "uuid",
 *       "weekday": 1-7,
 *       "startTime": "HH:mm",
 *       "endTime": "HH:mm",
 *       "effectiveFrom": "YYYY-MM-DD",
 *       "effectiveTo": "YYYY-MM-DD" (optional),
 *       "isActive": true
 *     }
 *   ],
 *   "updates": [
 *     {
 *       "id": "uuid",
 *       "classId": "uuid" (optional),
 *       ... any other fields to update
 *     }
 *   ],
 *   "deletes": ["uuid", "uuid"]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "created": [...],
 *     "updated": [...],
 *     "deleted": [...],
 *     "errors": [{ operation, error }, ...]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized) return auth.response;
    if (!auth.context) return auth.response;

    const origin = request.headers.get("origin");
    const tenantId = auth.context.tenantId;

    const body = await request.json();
    const validatedOperations = batchScheduleOperationSchema.parse(body);

    const result = await scheduleService.saveScheduleBatch(
      tenantId,
      validatedOperations
    );

    // If there are errors but some operations succeeded, return 207 Multi-Status
    // If everything failed, return 400
    // If all succeeded, return 200
    const statusCode =
      result.errors.length === 0
        ? 200
        : result.created.length + result.updated.length + result.deleted.length > 0
          ? 207
          : 400;

    return ok(result, statusCode, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error in batch operation";
    return fail(
      {
        code: "batch_error",
        message,
      },
      400,
      request.headers.get("origin")
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
