import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { publicEnrollmentService } from "@/lib/services/publicEnrollmentService";
import { StudentLimitError } from "@/lib/services/studentQuotaService";
import { publicEnrollmentSchema, jointEnrollmentSchema } from "@/lib/validators/publicEnrollmentSchemas";
import { handleCorsPreFlight } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    
    // Extract tenant slug from body
    const { tenantSlug, ...enrollmentData } = body;
    
    if (!tenantSlug) {
      return fail(
        {
          code: "invalid_request",
          message: "tenantSlug is required",
        },
        400,
        origin
      );
    }

      // Check if this is a joint enrollment
      const isJointEnrollment = enrollmentData.is_joint_enrollment === true;

      if (isJointEnrollment) {
        // Validate joint enrollment data
        const parsed = jointEnrollmentSchema.safeParse(enrollmentData);

        if (!parsed.success) {
          return fail(
            {
              code: "invalid_request",
              message: "Invalid joint enrollment data",
              details: parsed.error.flatten(),
            },
            400,
            origin
          );
        }

        // Create joint enrollment
        const result = await publicEnrollmentService.createJointEnrollment(
          tenantSlug,
          parsed.data
        );

        return ok(
          {
            success: true,
            enrollmentIds: result.enrollmentIds,
            studentIds: result.studentIds,
            groupId: result.groupId,
            message: `Joint enrollment created successfully for ${result.studentIds.length} students`,
          },
          201,
          origin
        );
      } else {
        // Validate single enrollment data
        const parsed = publicEnrollmentSchema.safeParse(enrollmentData);

        if (!parsed.success) {
          return fail(
            {
              code: "invalid_request",
              message: "Invalid enrollment data",
              details: parsed.error.flatten(),
            },
            400,
            origin
          );
        }

        // Create single enrollment
        const result = await publicEnrollmentService.createEnrollment(
          tenantSlug,
          parsed.data
        );

        if (result.waitlistCreated) {
          return ok(
            {
              success: true,
              waitlistCreated: true,
              waitlistCount: result.waitlistCount || 0,
              message: result.message || "Clase completa. Se añadió a lista de espera.",
            },
            202,
            origin
          );
        }

        return ok(
          {
            success: true,
            enrollmentId: result.enrollmentId,
            studentId: result.studentId,
            message: "Enrollment created successfully",
          },
          201,
          origin
        );
      }
  } catch (error) {
    if (error instanceof StudentLimitError) {
      return fail(
        {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        409,
        origin
      );
    }

    const message = error instanceof Error ? error.message : "Failed to create enrollment";
    
    // Return appropriate error based on message
    if (message.includes("not found")) {
      return fail({ code: "not_found", message }, 404, origin);
    }
    if (message.includes("full")) {
      return fail({ code: "capacity_exceeded", message }, 409, origin);
    }
    
    return fail(
      {
        code: "create_failed",
        message,
      },
      500,
      origin
    );
  }
}
