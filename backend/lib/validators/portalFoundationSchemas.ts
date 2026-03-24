import { z } from "zod";

const MAX_FEED_IMAGES = 8;
const postVisibilityScopeSchema = z.enum(["public", "followers", "school"]);

export const upsertStudentProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  stageName: z.string().trim().max(120).optional().nullable(),
  bio: z.string().trim().max(1200).optional().nullable(),
  avatarUrl: z.string().trim().url().max(500).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  styles: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
  level: z.string().trim().max(80).optional().nullable(),
  yearsExperience: z
    .number()
    .int()
    .min(0)
    .max(80)
    .optional()
    .nullable(),
  publicProfile: z.boolean().optional().default(true),
});

export const listPublicSchoolsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const listTrendingSchoolsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  orderBy: z.enum(["activity", "students", "engagement", "followers", "views"]).optional().default("engagement"),
});

export const listRecommendedSchoolsSchema = z.object({
  city: z.string().trim().max(120).optional(),
  styles: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
  level: z.string().trim().max(80).optional(),
  minStudents: z.coerce.number().int().min(0).optional(),
  maxStudents: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const searchPublicSchoolsSchema = listPublicSchoolsSchema.extend({
  city: z.string().trim().max(120).optional(),
  level: z.string().trim().max(80).optional(),
  minStudents: z.coerce.number().int().min(0).optional(),
  maxStudents: z.coerce.number().int().min(0).optional(),
});

export const compareSchoolsSchema = z.object({
  slugs: z.array(z.string().trim().min(1).max(120)).min(2).max(3),
});

export const listPublicFeedSchema = z.object({
  tenantId: z.string().uuid().optional(),
  type: z.enum(["class", "event", "achievement", "announcement", "choreography"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const listPublicEventsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  upcomingOnly: z.coerce.boolean().optional().default(false),
});

export const createFeedPostSchema = z.object({
  authorType: z.enum(["school", "teacher"]).default("school"),
  authorName: z.string().trim().min(1).max(150),
  authorAvatarUrl: z.string().trim().url().max(500).optional().nullable(),
  type: z.enum(["class", "event", "achievement", "announcement", "choreography"]),
  content: z.string().trim().min(1).max(4000),
  imageUrls: z.array(z.string().trim().url().max(500)).max(MAX_FEED_IMAGES).optional().default([]),
  videoUrl: z.string().trim().url().max(500).optional().nullable(),
  mediaIds: z.array(z.string().uuid()).max(MAX_FEED_IMAGES + 1).optional().default([]),
  isPublic: z.boolean().optional().default(true),
  visibilityScope: postVisibilityScopeSchema.optional(),
});

export const updateFeedPostSchema = createFeedPostSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided"
);

export const schoolProfileSchema = z.object({
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1200).optional().nullable(),
  logoUrl: z.string().trim().url().max(500).optional().nullable(),
  location: z.string().trim().max(180).optional().nullable(),
  isPublic: z.boolean().optional().default(true),
});

export const schoolAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(220),
  content: z.string().trim().min(1).max(4000),
  isImportant: z.boolean().optional().default(false),
  isUrgent: z.boolean().optional().default(false),
  notifyAll: z.boolean().optional().default(true),
});

export const teacherListSchema = z.object({
  tenantId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const createAlbumSchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(1200).optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  isPublic: z.boolean().optional().default(true),
});

export const uploadPhotoSchema = z.object({
  albumId: z.string().uuid(),
  imageUrl: z.string().trim().url().max(500),
  caption: z.string().trim().max(500).optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  isPublic: z.boolean().optional().default(true),
});

export const uploadMediaFromUrlSchema = z.object({
  url: z.string().trim().url().max(1000),
  kind: z.enum(["image", "video"]).optional(),
  mimeType: z.string().trim().max(150).optional().nullable(),
  sizeBytes: z.coerce.number().int().min(0).max(500 * 1024 * 1024).optional().nullable(),
  width: z.coerce.number().int().min(1).max(10000).optional().nullable(),
  height: z.coerce.number().int().min(1).max(10000).optional().nullable(),
  durationSeconds: z.coerce.number().min(0).max(24 * 60 * 60).optional().nullable(),
  isPublic: z.coerce.boolean().optional().default(true),
});

export const mediaAssetIdSchema = z.object({
  id: z.string().uuid(),
});

export const listPhotosByAlbumSchema = z.object({
  albumId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const teacherPostSchema = z.object({
  tenantId: z.string().uuid().optional(),
  type: z.enum(["class", "event", "achievement", "announcement", "choreography"]),
  content: z.string().trim().min(1).max(4000),
  imageUrls: z.array(z.string().trim().url().max(500)).max(MAX_FEED_IMAGES).optional().default([]),
  videoUrl: z.string().trim().url().max(500).optional().nullable(),
  mediaIds: z.array(z.string().uuid()).max(MAX_FEED_IMAGES + 1).optional().default([]),
  isPublic: z.boolean().optional().default(true),
  visibilityScope: postVisibilityScopeSchema.optional(),
  requiresApproval: z.boolean().optional().default(true),
});

export const teacherScheduleQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
});

export const classStudentsParamsSchema = z.object({
  classId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
});

export const listFollowersSchema = z.object({
  profileId: z.string().uuid(),
});

export const followSchoolParamsSchema = z.object({
  tenantId: z.string().uuid(),
});

export const listFollowedSchoolsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const inviteStudentsSchema = z.object({
  emails: z.array(z.string().trim().email().max(320)).min(1).max(200),
  message: z.string().trim().max(1200).optional().nullable(),
  expiresInDays: z.coerce.number().int().min(1).max(90).optional().default(14),
});

export const acceptSchoolInvitationSchema = z.object({
  code: z.string().trim().min(8).max(120),
});

export const listInvitationsSchema = z.object({
  status: z.enum(["pending", "accepted", "revoked", "expired"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const eventIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listEventParticipantsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const listEventMediaSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const attachEventMediaSchema = z.object({
  mediaIds: z.array(z.string().uuid()).min(1).max(30),
});

export const createContentReportSchema = z.object({
  contentType: z.enum(["post", "profile"]),
  contentId: z.string().uuid(),
  reason: z.enum(["inappropriate", "spam", "harassment", "minor_safety", "other"]),
  description: z.string().trim().max(1200).optional().nullable(),
});

export const updateContentReportSchema = z.object({
  status: z.enum(["open", "investigating", "resolved", "dismissed"]),
  actionTaken: z.enum(["none", "warned", "hidden", "deleted"]).optional().default("none"),
  resolutionNotes: z.string().trim().max(2000).optional().nullable(),
});

export const reportIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listContentReportsSchema = z.object({
  status: z.enum(["open", "investigating", "resolved", "dismissed"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const listNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  onlyUnread: z.coerce.boolean().optional().default(false),
});

export const saveItemParamsSchema = z.object({
  itemType: z.enum(["post", "event"]),
  itemId: z.string().uuid(),
});

export const listSavedItemsSchema = z.object({
  itemType: z.enum(["post", "event"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const trackPortalAnalyticsSchema = z.object({
  eventName: z.string().trim().min(1).max(120),
  category: z.enum(["engagement", "funnel", "adoption", "retention"]),
  sessionId: z.string().trim().min(8).max(160).optional(),
  tenantId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  limitPerType: z.coerce.number().int().min(1).max(20).optional().default(6),
});

export const privacySettingsSchema = z.object({
  showProfileInSearch: z.boolean().optional().default(true),
  showCity: z.boolean().optional().default(true),
  showStats: z.boolean().optional().default(true),
  showAchievements: z.boolean().optional().default(true),
  showCertifications: z.boolean().optional().default(true),
  allowFollowerNotifications: z.boolean().optional().default(true),
  allowUsageAnalytics: z.boolean().optional().default(true),
});

export const portalAnalyticsOverviewSchema = z.object({
  days: z.coerce.number().int().min(7).max(365).optional().default(30),
});

export type UpsertStudentProfileInput = z.infer<typeof upsertStudentProfileSchema>;
export type CreateFeedPostInput = z.infer<typeof createFeedPostSchema>;
export type UpdateFeedPostInput = z.infer<typeof updateFeedPostSchema>;
export type SaveItemParamsInput = z.infer<typeof saveItemParamsSchema>;
export type SchoolProfileInput = z.infer<typeof schoolProfileSchema>;
export type SchoolAnnouncementInput = z.infer<typeof schoolAnnouncementSchema>;
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;
export type UploadMediaFromUrlInput = z.infer<typeof uploadMediaFromUrlSchema>;
export type TeacherPostInput = z.infer<typeof teacherPostSchema>;
export type ListTrendingSchoolsInput = z.infer<typeof listTrendingSchoolsSchema>;
export type ListRecommendedSchoolsInput = z.infer<typeof listRecommendedSchoolsSchema>;
export type SearchPublicSchoolsInput = z.infer<typeof searchPublicSchoolsSchema>;
export type CompareSchoolsInput = z.infer<typeof compareSchoolsSchema>;
export type TrackPortalAnalyticsInput = z.infer<typeof trackPortalAnalyticsSchema>;
export type GlobalSearchQueryInput = z.infer<typeof globalSearchQuerySchema>;
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;
export type PortalAnalyticsOverviewInput = z.infer<typeof portalAnalyticsOverviewSchema>;
