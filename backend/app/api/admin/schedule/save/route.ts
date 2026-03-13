import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ok, fail } from "@/lib/http";
import { scheduleService } from "@/lib/services/scheduleService";
import { batchScheduleOperationSchema } from "@/lib/validators/scheduleSchemas";
import { z } from "zod";

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
    console.log("[SCHEDULE SAVE] Request body:", JSON.stringify(body, null, 2));
    
    console.log("[SCHEDULE SAVE] Starting validation...");
    const validatedOperations = batchScheduleOperationSchema.parse(body);
    console.log("[SCHEDULE SAVE] Validation passed. Processing operations...");

    const result = await scheduleService.saveScheduleBatch(
      tenantId,
      validatedOperations
    );

    console.log("[SCHEDULE SAVE] Service result:", {
      created: result.created.length,
      updated: result.updated.length,
      deleted: result.deleted.length,
      errors: result.errors.length
    });

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
    console.error("[SCHEDULE SAVE] ERROR CAUGHT:", error);
    console.error("[SCHEDULE SAVE] Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("[SCHEDULE SAVE] Error message:", error instanceof Error ? error.message : String(error));
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const message = error.issues?.[0]?.message || "Validation error";
      console.error("[SCHEDULE SAVE] Zod validation error:", error.issues);
      return fail(
        {
          code: "validation_error",
          message,
          details: error.issues,
        },
        400,
        request.headers.get("origin")
      );
    }
    
    const message = error instanceof Error ? error.message : "Error in batch operation";
    console.error("[SCHEDULE SAVE] Returning error response:", { code: "batch_error", message });
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
