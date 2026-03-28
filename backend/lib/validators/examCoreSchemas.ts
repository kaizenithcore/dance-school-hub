import { z } from "zod";

export const examMembershipRoleSchema = z.enum(["admin", "member"]);
export const examSessionStatusSchema = z.enum([
  "draft",
  "published",
  "enrollment_open",
  "closed",
  "evaluated",
  "certified",
]);

export const createExamOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  contact_email: z.string().email().max(180).nullable().optional(),
  active: z.boolean().optional().default(true),
});

export const createExamMembershipSchema = z.object({
  organization_id: z.string().uuid(),
  school_id: z.string().uuid(),
  role: examMembershipRoleSchema.default("member"),
});

export const createExamSessionSchema = z.object({
  organization_id: z.string().uuid().nullable().optional(),
  school_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).nullable().optional(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  enrollment_start: z.string().date().nullable().optional(),
  enrollment_end: z.string().date().nullable().optional(),
  status: examSessionStatusSchema.default("draft"),
}).superRefine((value, ctx) => {
  const hasOrg = Boolean(value.organization_id);
  const hasSchool = Boolean(value.school_id);

  if (hasOrg === hasSchool) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["organization_id"],
      message: "Provide exactly one scope: organization_id or school_id",
    });
  }

  if (value.end_date < value.start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message: "end_date must be greater than or equal to start_date",
    });
  }

  if (value.enrollment_start && value.enrollment_end && value.enrollment_end < value.enrollment_start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["enrollment_end"],
      message: "enrollment_end must be greater than or equal to enrollment_start",
    });
  }
});

export const transitionExamSessionLifecycleSchema = z.object({
  status: examSessionStatusSchema,
  reason: z.string().trim().min(3).max(500).optional(),
});

export const createExamEnrollmentSchema = z.object({
  student_id: z.string().uuid().nullable().optional(),
  external_student_name: z.string().trim().min(1).max(180).nullable().optional(),
  external_student_email: z.string().email().max(180).nullable().optional(),
  school_id: z.string().uuid().nullable().optional(),
  form_values: z.record(z.string(), z.unknown()).optional().default({}),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional().default("pending"),
}).superRefine((value, ctx) => {
  if (!value.student_id && !value.external_student_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["student_id"],
      message: "Provide student_id or external_student_name",
    });
  }
});

export const createExamEvaluationSchema = z.object({
  config: z.array(
    z.object({
      name: z.string().trim().min(1).max(120),
      weight: z.number().positive().max(1),
    })
  ).min(1),
  passing_score: z.number().min(0).max(100).optional().default(60),
}).superRefine((value, ctx) => {
  const totalWeight = value.config.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.0001) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["config"],
      message: "The sum of weights must be exactly 1",
    });
  }
});

export const upsertExamResultSchema = z.object({
  enrollment_id: z.string().uuid(),
  scores: z.record(z.string(), z.number().min(0).max(100)).optional().default({}),
  manual_final_score: z.number().min(0).max(100).nullable().optional(),
});

export const generateExamCertificateSchema = z.object({
  result_id: z.string().uuid(),
  template_id: z.string().uuid().nullable().optional(),
});

export const queueExamCertificateSchema = generateExamCertificateSchema.extend({
  process_now: z.boolean().optional().default(false),
  max_attempts: z.number().int().min(1).max(10).optional().default(3),
});

export const queueExamCertificateBatchSchema = z.object({
  session_id: z.string().uuid(),
  template_id: z.string().uuid().nullable().optional(),
  only_passed: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(2000).optional().default(1000),
  process_now: z.boolean().optional().default(false),
  max_attempts: z.number().int().min(1).max(10).optional().default(3),
});

export const examCertificateJobStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const listExamCertificateJobsSchema = z.object({
  session_id: z.string().uuid().optional(),
  status: examCertificateJobStatusSchema.optional(),
  school_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
});

export const tickExamCertificateJobsSchema = z.object({
  school_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(500).optional().default(50),
});

export const inviteSchoolToExamSessionSchema = z.object({
  school_id: z.string().uuid(),
});

export const examNotificationEventSchema = z.enum([
  "enrollment_open",
  "enrollment_closed",
  "result_available",
]);

export const examNotificationDeliveryStatusSchema = z.enum([
  "queued",
  "processing",
  "sent",
  "failed",
]);

export const examAuditActionSchema = z.enum([
  "evaluation_edited",
  "grade_modified",
  "certificate_generated",
]);

export const examFineRoleSchema = z.enum([
  "examiner",
  "grader",
  "supervisor",
  "association_admin",
]);

export const triggerExamNotificationsSchema = z.object({
  session_ids: z.array(z.string().uuid()).max(200).optional(),
  event_types: z.array(examNotificationEventSchema).min(1).optional(),
  process_queue: z.boolean().optional().default(false),
  queue_limit: z.number().int().min(1).max(100).optional().default(20),
});

export const listExamNotificationDispatchesSchema = z.object({
  session_id: z.string().uuid().optional(),
  school_id: z.string().uuid().optional(),
  event_type: examNotificationEventSchema.optional(),
  status: examNotificationDeliveryStatusSchema.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export const listExamAuditEventsSchema = z.object({
  session_id: z.string().uuid().optional(),
  school_id: z.string().uuid().optional(),
  action: examAuditActionSchema.optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
});

export const upsertExamRoleAssignmentSchema = z.object({
  organization_id: z.string().uuid(),
  school_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid(),
  role: examFineRoleSchema,
  is_active: z.boolean().optional().default(true),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const listExamRoleAssignmentsSchema = z.object({
  organization_id: z.string().uuid(),
  school_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  role: examFineRoleSchema.optional(),
  active_only: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(500).optional().default(100),
});

export const upgradeExamToProSchema = z.object({
  organization_id: z.string().uuid().optional(),
  redirect_base_url: z.string().url().optional(),
});

export const examAnalyticsQuerySchema = z.object({
  organization_id: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  persist: z.preprocess((value) => {
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return value;
  }, z.boolean().optional().default(true)),
}).superRefine((value, ctx) => {
  if (value.from && value.to && value.to < value.from) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["to"],
      message: "to must be greater than or equal to from",
    });
  }
});

export type CreateExamOrganizationInput = z.infer<typeof createExamOrganizationSchema>;
export type CreateExamMembershipInput = z.infer<typeof createExamMembershipSchema>;
export type CreateExamSessionInput = z.infer<typeof createExamSessionSchema>;
export type TransitionExamSessionLifecycleInput = z.infer<typeof transitionExamSessionLifecycleSchema>;
export type CreateExamEnrollmentInput = z.infer<typeof createExamEnrollmentSchema>;
export type CreateExamEvaluationInput = z.infer<typeof createExamEvaluationSchema>;
export type UpsertExamResultInput = z.infer<typeof upsertExamResultSchema>;
export type GenerateExamCertificateInput = z.infer<typeof generateExamCertificateSchema>;
export type QueueExamCertificateInput = z.infer<typeof queueExamCertificateSchema>;
export type QueueExamCertificateBatchInput = z.infer<typeof queueExamCertificateBatchSchema>;
export type ListExamCertificateJobsInput = z.infer<typeof listExamCertificateJobsSchema>;
export type TickExamCertificateJobsInput = z.infer<typeof tickExamCertificateJobsSchema>;
export type InviteSchoolToExamSessionInput = z.infer<typeof inviteSchoolToExamSessionSchema>;
export type TriggerExamNotificationsInput = z.infer<typeof triggerExamNotificationsSchema>;
export type ListExamNotificationDispatchesInput = z.infer<typeof listExamNotificationDispatchesSchema>;
export type ListExamAuditEventsInput = z.infer<typeof listExamAuditEventsSchema>;
export type UpsertExamRoleAssignmentInput = z.infer<typeof upsertExamRoleAssignmentSchema>;
export type ListExamRoleAssignmentsInput = z.infer<typeof listExamRoleAssignmentsSchema>;
export type UpgradeExamToProInput = z.infer<typeof upgradeExamToProSchema>;
export type ExamAnalyticsQueryInput = z.infer<typeof examAnalyticsQuerySchema>;
