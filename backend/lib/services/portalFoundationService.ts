import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import {
  createPortalNotification,
  PORTAL_NOTIFICATION_TYPES,
  type PortalNotificationType,
} from "@/lib/services/portalNotificationService";
import type {
  CompareSchoolsInput,
  CreateAlbumInput,
  CreateFeedPostInput,
  GlobalSearchQueryInput,
  ListRecommendedSchoolsInput,
  ListTrendingSchoolsInput,
  PortalAnalyticsOverviewInput,
  PrivacySettingsInput,
  SchoolAnnouncementInput,
  SchoolProfileInput,
  SaveItemParamsInput,
  SearchPublicSchoolsInput,
  TrackPortalAnalyticsInput,
  TeacherPostInput,
  UpdateFeedPostInput,
  UploadPhotoInput,
  UploadMediaFromUrlInput,
  UpsertStudentProfileInput,
} from "@/lib/validators/portalFoundationSchemas";
import { randomUUID } from "node:crypto";

interface UserProfileRow {
  display_name: string | null;
}

interface PrivacySettings {
  showProfileInSearch: boolean;
  showCity: boolean;
  showStats: boolean;
  showAchievements: boolean;
  showCertifications: boolean;
  allowFollowerNotifications: boolean;
  allowUsageAnalytics: boolean;
}

interface PublicProfileSummary {
  id: string;
  display_name: string;
  stage_name: string | null;
  avatar_url: string | null;
  public_profile: boolean;
  city: string | null;
  styles: string[];
}

interface FollowersQueryRow {
  created_at: string;
  follower: PublicProfileSummary | PublicProfileSummary[] | null;
}

interface FollowingQueryRow {
  created_at: string;
  following: PublicProfileSummary | PublicProfileSummary[] | null;
}

interface EventRow {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string;
  description: string | null;
  status: "draft" | "published";
}

interface SavedItemRow {
  id: string;
  user_id: string;
  tenant_id: string | null;
  item_type: "post" | "event";
  item_id: string;
  created_at: string;
}

interface FeedLikeRow {
  post_id: string;
}

interface TeacherPublicProfile {
  id: string;
  tenantId: string;
  schoolName: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  status: string;
  classesCount: number;
}

interface SchoolFeedPostRow {
  id: string;
  tenant_id: string;
  author_type: "school" | "teacher";
  author_name: string;
  author_avatar_url: string | null;
  type: "class" | "event" | "achievement" | "announcement" | "choreography";
  content: string;
  image_urls: string[];
  video_url: string | null;
  is_public: boolean;
  visibility_scope?: "public" | "followers" | "school" | null;
  likes_count: number;
  saves_count: number;
  approval_status?: "draft" | "pending_approval" | "published" | "rejected";
  approval_notes?: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

interface MediaAssetRow {
  id: string;
  tenant_id: string;
  created_by: string | null;
  kind: "image" | "video";
  provider: string;
  bucket: string | null;
  path: string | null;
  url: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  processing_status: "pending" | "processing" | "ready" | "failed";
  processing_metadata: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface FeedPostMediaLinkRow {
  post_id: string;
  media_id: string;
  sort_order: number;
  media_assets: MediaAssetRow | MediaAssetRow[] | null;
}

interface EventMediaLinkRow {
  id: string;
  event_id: string;
  media_id: string;
  sort_order: number;
  created_at: string;
  media_assets: MediaAssetRow | MediaAssetRow[] | null;
}

interface SchoolInvitationRow {
  id: string;
  tenant_id: string;
  invited_email: string;
  invitation_code: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  message: string | null;
  invited_by_user_id: string | null;
  accepted_by_user_id: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

interface ContentReportRow {
  id: string;
  tenant_id: string;
  content_type: "post" | "profile";
  content_id: string;
  reported_by_user_id: string;
  reason: "inappropriate" | "spam" | "harassment" | "minor_safety" | "other";
  description: string | null;
  status: "open" | "investigating" | "resolved" | "dismissed";
  action_taken: "none" | "warned" | "hidden" | "deleted" | null;
  moderator_user_id: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SchoolGalleryAlbumRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  event_id: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface SchoolGalleryPhotoRow {
  id: string;
  tenant_id: string;
  album_id: string;
  image_url: string;
  caption: string | null;
  event_id: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

interface SchoolDiscoveryMetricsRow {
  views_count: number;
  followers_count: number;
  conversion_rate: number;
  featured_until: string | null;
  last_activity_at: string | null;
}

interface PublicSchoolRow {
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  location: string | null;
  activity_level: string;
  total_students: number;
  is_public: boolean;
  school_discovery_metrics?: SchoolDiscoveryMetricsRow | SchoolDiscoveryMetricsRow[] | null;
}

interface TeacherClassRow {
  id: string;
  tenant_id: string;
  name: string;
  room_id: string | null;
  discipline_id: string | null;
  category_id: string | null;
  status: string;
  capacity: number;
  teachers?: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  class_teachers?: Array<{
    teacher_id: string;
    teachers: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  }>;
}

function normalizeNullable(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asArrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function inferMediaKind(kind: "image" | "video" | undefined, mimeType: string | null | undefined, url: string) {
  if (kind) {
    return kind;
  }

  const normalizedMime = (mimeType ?? "").toLowerCase();
  if (normalizedMime.startsWith("video/")) {
    return "video" as const;
  }

  if (normalizedMime.startsWith("image/")) {
    return "image" as const;
  }

  const normalizedUrl = url.toLowerCase();
  const videoExtensions = [".mp4", ".mov", ".m4v", ".webm", ".ogg"];
  const isVideo = videoExtensions.some((extension) => normalizedUrl.includes(extension));
  return isVideo ? ("video" as const) : ("image" as const);
}

function resolvePostVisibilityScope(
  visibilityScope: "public" | "followers" | "school" | undefined,
  isPublic: boolean | undefined
): "public" | "followers" | "school" {
  if (visibilityScope) {
    return visibilityScope;
  }

  if (isPublic === false) {
    return "school";
  }

  return "public";
}

const PORTAL_MEDIA_BUCKET = "portal-media";
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  showProfileInSearch: true,
  showCity: true,
  showStats: true,
  showAchievements: true,
  showCertifications: true,
  allowFollowerNotifications: true,
  allowUsageAnalytics: true,
};

function normalizePrivacySettings(value: unknown): PrivacySettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_PRIVACY_SETTINGS;
  }

  const input = value as Record<string, unknown>;
  return {
    showProfileInSearch: input.showProfileInSearch !== false,
    showCity: input.showCity !== false,
    showStats: input.showStats !== false,
    showAchievements: input.showAchievements !== false,
    showCertifications: input.showCertifications !== false,
    allowFollowerNotifications: input.allowFollowerNotifications !== false,
    allowUsageAnalytics: input.allowUsageAnalytics !== false,
  };
}

function getDateRangeFromDays(days: number): { fromIso: string; fromDate: string } {
  const now = Date.now();
  const from = new Date(now - days * 24 * 60 * 60 * 1000);
  return {
    fromIso: from.toISOString(),
    fromDate: from.toISOString().slice(0, 10),
  };
}

function generateInvitationCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

async function resolveDisplayName(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const profile = data as UserProfileRow | null;
  const candidate = normalizeNullable(profile?.display_name);
  if (candidate) {
    return candidate;
  }

  return "Bailarin";
}

async function resolveDefaultTenantId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.tenant_id ?? null;
}

async function syncFollowCounters(profileIdA: string, profileIdB: string): Promise<void> {
  const { count: aFollowing } = await supabaseAdmin
    .from("student_followers")
    .select("id", { count: "exact", head: true })
    .eq("follower_profile_id", profileIdA);

  const { count: aFollowers } = await supabaseAdmin
    .from("student_followers")
    .select("id", { count: "exact", head: true })
    .eq("following_profile_id", profileIdA);

  const { count: bFollowing } = await supabaseAdmin
    .from("student_followers")
    .select("id", { count: "exact", head: true })
    .eq("follower_profile_id", profileIdB);

  const { count: bFollowers } = await supabaseAdmin
    .from("student_followers")
    .select("id", { count: "exact", head: true })
    .eq("following_profile_id", profileIdB);

  await Promise.all([
    supabaseAdmin
      .from("student_profiles")
      .update({
        following_count: aFollowing ?? 0,
        followers_count: aFollowers ?? 0,
      })
      .eq("id", profileIdA),
    supabaseAdmin
      .from("student_profiles")
      .update({
        following_count: bFollowing ?? 0,
        followers_count: bFollowers ?? 0,
      })
      .eq("id", profileIdB),
  ]);
}

async function syncPostSaveCount(postId: string): Promise<void> {
  const { count } = await supabaseAdmin
    .from("student_saved_items")
    .select("id", { count: "exact", head: true })
    .eq("item_type", "post")
    .eq("item_id", postId);

  await supabaseAdmin
    .from("school_feed_posts")
    .update({ saves_count: count ?? 0 })
    .eq("id", postId);
}

async function syncPostLikeCount(postId: string): Promise<void> {
  const { count } = await supabaseAdmin
    .from("feed_interactions")
    .select("id", { count: "exact", head: true })
    .eq("interaction_type", "like")
    .eq("post_id", postId);

  await supabaseAdmin
    .from("school_feed_posts")
    .update({ likes_count: count ?? 0 })
    .eq("id", postId);
}

async function createNotification(input: {
  tenantId: string | null;
  userId: string;
  type: PortalNotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await createPortalNotification(input);
}

async function notifySchoolPostPublished(params: {
  tenantId: string;
  actorUserId: string;
  postId: string;
  postType: "class" | "event" | "achievement" | "announcement" | "choreography";
  visibilityScope: "public" | "followers" | "school";
  previewContent: string;
}) {
  const [schoolMembersResult, schoolFollowersResult] = await Promise.all([
    supabaseAdmin
      .from("tenant_memberships")
      .select("user_id")
      .eq("tenant_id", params.tenantId)
      .eq("is_active", true),
    supabaseAdmin
      .from("student_school_follows")
      .select("student_profile_id")
      .eq("tenant_id", params.tenantId),
  ]);

  const schoolFollowerProfileIds = Array.from(
    new Set((schoolFollowersResult.data ?? []).map((row) => row.student_profile_id as string))
  );

  let schoolFollowerUserIds: string[] = [];
  if (schoolFollowerProfileIds.length > 0) {
    const { data: followerProfiles } = await supabaseAdmin
      .from("student_profiles")
      .select("user_id")
      .in("id", schoolFollowerProfileIds);

    schoolFollowerUserIds = (followerProfiles ?? [])
      .map((profile) => profile.user_id as string)
      .filter((userId) => userId.length > 0);
  }

  const memberUserIds = (schoolMembersResult.data ?? [])
    .map((row) => row.user_id as string)
    .filter((userId) => userId.length > 0);

  const recipients = Array.from(new Set([...memberUserIds, ...schoolFollowerUserIds])).filter(
    (userId) => userId !== params.actorUserId
  );

  if (recipients.length === 0) {
    return;
  }

  const clipped = params.previewContent.trim().slice(0, 140);
  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        tenantId: params.tenantId,
        userId,
        type: PORTAL_NOTIFICATION_TYPES.SCHOOL_POST_PUBLISHED,
        title: "Nuevo post de tu escuela",
        message: clipped.length > 0 ? clipped : "La escuela publico nuevo contenido.",
        actionUrl: "/portal/app/feed",
        metadata: {
          postId: params.postId,
          tenantId: params.tenantId,
          postType: params.postType,
          visibilityScope: params.visibilityScope,
        },
      })
    )
  );
}

function normalizeTeacherRows(item: TeacherClassRow): Array<{ id: string; name: string }> {
  if (Array.isArray(item.class_teachers) && item.class_teachers.length > 0) {
    return item.class_teachers
      .map((row) => (Array.isArray(row.teachers) ? row.teachers[0] : row.teachers))
      .filter((teacher): teacher is { id: string; name: string } => Boolean(teacher?.id && teacher?.name));
  }

  const singleTeacher = Array.isArray(item.teachers) ? item.teachers[0] : item.teachers;
  return singleTeacher?.id && singleTeacher?.name ? [singleTeacher] : [];
}

async function resolveTeacherByUser(userId: string, email: string | undefined, tenantId?: string) {
  const normalizedEmail = normalizeNullable(email);

  if (!normalizedEmail) {
    throw new Error("Teacher account email is required");
  }

  const membershipsQuery = supabaseAdmin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (tenantId) {
    membershipsQuery.eq("tenant_id", tenantId);
  }

  const { data: memberships, error: membershipsError } = await membershipsQuery;
  if (membershipsError) {
    throw new Error(`Failed to resolve tenant memberships: ${membershipsError.message}`);
  }

  const tenantIds = (memberships ?? []).map((item) => item.tenant_id as string);
  if (tenantIds.length === 0) {
    throw new Error("No active tenant memberships found for teacher account");
  }

  const { data: teachers, error: teacherError } = await supabaseAdmin
    .from("teachers")
    .select("id, tenant_id, name, email, status")
    .in("tenant_id", tenantIds)
    .eq("status", "active")
    .ilike("email", normalizedEmail)
    .order("created_at", { ascending: true })
    .limit(2);

  if (teacherError) {
    throw new Error(`Failed to resolve teacher profile: ${teacherError.message}`);
  }

  if (!teachers || teachers.length === 0) {
    throw new Error("Teacher profile not found for account email");
  }

  if (teachers.length > 1 && !tenantId) {
    throw new Error("Teacher belongs to multiple tenants; tenantId is required");
  }

  return teachers[0];
}

async function resolveSchoolAuthorName(tenantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("school_public_profiles")
    .select("name")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (data?.name) {
    return data.name;
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  return tenant?.name ?? "Escuela";
}

function normalizeMetrics(
  value: SchoolDiscoveryMetricsRow | SchoolDiscoveryMetricsRow[] | null | undefined
): SchoolDiscoveryMetricsRow {
  const metrics = Array.isArray(value) ? value[0] : value;
  return {
    views_count: metrics?.views_count ?? 0,
    followers_count: metrics?.followers_count ?? 0,
    conversion_rate: metrics?.conversion_rate ?? 0,
    featured_until: metrics?.featured_until ?? null,
    last_activity_at: metrics?.last_activity_at ?? null,
  };
}

async function calculatePublicSchoolMetrics(tenantId: string) {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [
    studentsActive,
    postsLast30,
    postsLast60,
    metrics,
    eventsLast30,
    eventsLast60,
  ] = await Promise.all([
    supabaseAdmin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
    supabaseAdmin
      .from("school_feed_posts")
      .select("likes_count, saves_count", { count: "exact" })
      .eq("tenant_id", tenantId)
      .gte("published_at", thirtyDaysAgo),
    supabaseAdmin
      .from("school_feed_posts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("published_at", sixtyDaysAgo)
      .lt("published_at", thirtyDaysAgo),
    supabaseAdmin
      .from("school_discovery_metrics")
      .select("views_count, followers_count, conversion_rate, last_activity_at")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .gte("start_date", thirtyDaysAgo.slice(0, 10)),
    supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "published")
      .gte("start_date", sixtyDaysAgo.slice(0, 10))
      .lt("start_date", thirtyDaysAgo.slice(0, 10)),
  ]);

  const postsCount = postsLast30.count ?? 0;
  const likesAndSaves = (postsLast30.data ?? []).reduce(
    (sum, row) => sum + (row.likes_count ?? 0) + (row.saves_count ?? 0),
    0
  );
  const activeStudents = studentsActive.count ?? 0;
  const engagementRate = postsCount > 0 ? Number((likesAndSaves / postsCount).toFixed(2)) : 0;

  const previousPostsCount = postsLast60.count ?? 0;
  const studentGrowthRate =
    previousPostsCount > 0
      ? Number((((postsCount - previousPostsCount) / previousPostsCount) * 100).toFixed(2))
      : postsCount > 0
        ? 100
        : 0;

  const previousEvents = eventsLast60.count ?? 0;
  const eventsGrowthRate =
    previousEvents > 0
      ? Number((((eventsLast30.count ?? 0) - previousEvents) / previousEvents * 100).toFixed(2))
      : (eventsLast30.count ?? 0) > 0
        ? 100
        : 0;

  return {
    activeStudents,
    postsRecent: postsCount,
    eventsRecent: eventsLast30.count ?? 0,
    engagementRate,
    postsPerWeek: Number((postsCount / 4).toFixed(2)),
    studentGrowthRate,
    eventsGrowthRate,
    followersCount: metrics.data?.followers_count ?? 0,
    viewsCount: metrics.data?.views_count ?? 0,
    conversionRate: metrics.data?.conversion_rate ?? 0,
    lastActivityAt: metrics.data?.last_activity_at ?? null,
  };
}

export const portalFoundationService = {
  async getOrCreateOwnProfile(userId: string) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to fetch profile: ${existingError.message}`);
    }

    if (existing) {
      return existing;
    }

    const displayName = await resolveDisplayName(userId);
    const defaultTenantId = await resolveDefaultTenantId(userId);

    const { data: created, error: createError } = await supabaseAdmin
      .from("student_profiles")
      .insert({
        user_id: userId,
        tenant_id: defaultTenantId,
        display_name: displayName,
        public_profile: true,
        styles: [],
      })
      .select("*")
      .single();

    if (createError || !created) {
      throw new Error(`Failed to create profile: ${createError?.message}`);
    }

    return created;
  },

  async upsertOwnProfile(userId: string, input: UpsertStudentProfileInput) {
    const existing = await this.getOrCreateOwnProfile(userId);

    const payload = {
      display_name: input.displayName,
      stage_name: normalizeNullable(input.stageName),
      bio: normalizeNullable(input.bio),
      avatar_url: normalizeNullable(input.avatarUrl),
      city: normalizeNullable(input.city),
      styles: input.styles,
      level: normalizeNullable(input.level),
      years_experience: input.yearsExperience ?? null,
      public_profile: input.publicProfile,
    };

    const { data, error } = await supabaseAdmin
      .from("student_profiles")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update profile: ${error?.message}`);
    }

    return data;
  },

  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    const ownProfile = await this.getOrCreateOwnProfile(userId);
    return normalizePrivacySettings((ownProfile as { privacy_settings?: unknown }).privacy_settings);
  },

  async updatePrivacySettings(userId: string, input: PrivacySettingsInput): Promise<PrivacySettings> {
    const ownProfile = await this.getOrCreateOwnProfile(userId);
    const current = normalizePrivacySettings((ownProfile as { privacy_settings?: unknown }).privacy_settings);
    const next = normalizePrivacySettings({ ...current, ...input });

    const { data, error } = await supabaseAdmin
      .from("student_profiles")
      .update({ privacy_settings: next })
      .eq("id", ownProfile.id)
      .select("privacy_settings")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update privacy settings: ${error?.message}`);
    }

    return normalizePrivacySettings((data as { privacy_settings?: unknown }).privacy_settings);
  },

  async exportOwnData(userId: string) {
    const ownProfile = await this.getOrCreateOwnProfile(userId);
    const studentId = (ownProfile as { student_id?: string | null }).student_id ?? null;
    const tenantId = (ownProfile as { tenant_id?: string | null }).tenant_id ?? null;

    const [savedItems, notifications, likes, followers, following, enrollments, attendance, analyticsEvents] = await Promise.all([
      supabaseAdmin
        .from("student_saved_items")
        .select("id, item_type, item_id, tenant_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("user_notifications")
        .select("id, type, title, message, action_url, metadata, is_read, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("feed_interactions")
        .select("post_id, interaction_type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("student_followers")
        .select("id, follower_profile_id, following_profile_id, created_at")
        .eq("following_profile_id", ownProfile.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("student_followers")
        .select("id, follower_profile_id, following_profile_id, created_at")
        .eq("follower_profile_id", ownProfile.id)
        .order("created_at", { ascending: false }),
      studentId && tenantId
        ? supabaseAdmin
            .from("enrollments")
            .select("id, class_id, status, payment_status, payment_method, created_at, confirmed_at, notes")
            .eq("student_id", studentId)
            .eq("tenant_id", tenantId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      studentId && tenantId
        ? supabaseAdmin
            .from("student_event_attendance")
            .select("id, event_id, status, confirmed_at, cancelled_at, created_at")
            .eq("student_id", studentId)
            .eq("tenant_id", tenantId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from("portal_analytics_events")
        .select("id, tenant_id, session_id, category, event_name, metadata, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: ownProfile,
      privacySettings: normalizePrivacySettings((ownProfile as { privacy_settings?: unknown }).privacy_settings),
      savedItems: savedItems.data ?? [],
      notifications: notifications.data ?? [],
      interactions: likes.data ?? [],
      followers: followers.data ?? [],
      following: following.data ?? [],
      enrollments: enrollments.data ?? [],
      eventAttendance: attendance.data ?? [],
      analyticsEvents: analyticsEvents.data ?? [],
    };
  },

  async trackAnalyticsEvent(input: TrackPortalAnalyticsInput, userId?: string) {
    if (userId) {
      const privacy = await this.getPrivacySettings(userId);
      if (!privacy.allowUsageAnalytics) {
        return { tracked: false, reason: "analytics_disabled" };
      }
    }

    const { error } = await supabaseAdmin.from("portal_analytics_events").insert({
      tenant_id: input.tenantId ?? null,
      user_id: userId ?? null,
      session_id: normalizeNullable(input.sessionId),
      category: input.category,
      event_name: input.eventName,
      metadata: input.metadata ?? {},
    });

    if (error) {
      throw new Error(`Failed to track analytics event: ${error.message}`);
    }

    return { tracked: true };
  },

  async globalSearch(input: GlobalSearchQueryInput) {
    const q = input.q.trim();
    const schoolPromise = this.searchPublicSchools({
      q,
      city: undefined,
      level: undefined,
      minStudents: undefined,
      maxStudents: undefined,
      limit: input.limitPerType,
      offset: 0,
    });

    const eventsPromise = this.listPublicEvents({
      tenantId: undefined,
      limit: input.limitPerType,
      offset: 0,
      upcomingOnly: false,
    });

    const profilesPromise = supabaseAdmin
      .from("student_profiles")
      .select("id, display_name, stage_name, avatar_url, city, styles, public_profile")
      .eq("public_profile", true)
      .eq("is_active", true)
      .or(`display_name.ilike.%${q}%,stage_name.ilike.%${q}%,city.ilike.%${q}%`)
      .order("updated_at", { ascending: false })
      .limit(input.limitPerType);

    const [schools, events, profiles] = await Promise.all([schoolPromise, eventsPromise, profilesPromise]);

    return {
      query: q,
      schools: schools.items,
      events: events.items,
      profiles: (profiles.data ?? []).map((item) => ({
        id: item.id,
        displayName: item.display_name,
        stageName: item.stage_name,
        avatarUrl: item.avatar_url,
        city: item.city,
        styles: asArrayOfStrings(item.styles),
        publicProfile: item.public_profile,
      })),
    };
  },

  async getPortalAnalyticsOverview(tenantId: string, input: PortalAnalyticsOverviewInput) {
    const { fromIso, fromDate } = getDateRangeFromDays(input.days);

    const [events, posts, eventsPublished, activeStudents, recentMembers] = await Promise.all([
      supabaseAdmin
        .from("portal_analytics_events")
        .select("category, event_name, metadata", { count: "exact" })
        .eq("tenant_id", tenantId)
        .gte("created_at", fromIso),
      supabaseAdmin
        .from("school_feed_posts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("published_at", fromIso),
      supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "published")
        .gte("start_date", fromDate),
      supabaseAdmin
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      supabaseAdmin
        .from("tenant_memberships")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .gte("created_at", fromIso),
    ]);

    const eventRows = events.data ?? [];
    const views = eventRows.filter((row) => row.event_name === "feed_view").length;
    const likes = eventRows.filter((row) => row.event_name === "post_like").length;
    const saves = eventRows.filter((row) => row.event_name === "post_save").length;
    const searches = eventRows.filter((row) => row.event_name === "global_search").length;
    const explorerViews = eventRows.filter((row) => row.event_name === "school_explorer_view").length;
    const onboardingCompletions = eventRows.filter((row) => row.event_name === "onboarding_completed").length;
    const enrollmentStarts = eventRows.filter((row) => row.event_name === "enrollment_started").length;
    const enrollmentCompletions = eventRows.filter((row) => row.event_name === "enrollment_completed").length;

    const interactions = likes + saves;
    const engagementRate = views > 0 ? Number(((interactions / views) * 100).toFixed(2)) : 0;
    const funnelStart = explorerViews + onboardingCompletions;
    const funnelConversionRate = funnelStart > 0 ? Number(((enrollmentCompletions / funnelStart) * 100).toFixed(2)) : 0;
    const churnRiskRate = activeStudents.count && activeStudents.count > 0
      ? Number((Math.max(activeStudents.count - (recentMembers.count ?? 0), 0) / activeStudents.count * 100).toFixed(2))
      : 0;

    return {
      windowDays: input.days,
      trackedEvents: events.count ?? 0,
      engagement: {
        views,
        likes,
        saves,
        searches,
        engagementRate,
      },
      funnel: {
        explorerViews,
        onboardingCompletions,
        enrollmentStarts,
        enrollmentCompletions,
        conversionRate: funnelConversionRate,
      },
      adoption: {
        postsPublished: posts.count ?? 0,
        eventsPublished: eventsPublished.count ?? 0,
        featureUse: {
          globalSearches: searches,
          savedInteractions: saves,
          likeInteractions: likes,
        },
      },
      retention: {
        activeStudents: activeStudents.count ?? 0,
        activeNewMembers: recentMembers.count ?? 0,
        churnRiskRate,
      },
      generatedAt: new Date().toISOString(),
    };
  },

  async listPublicSchools(input: { q?: string; limit: number; offset: number }) {
    const { q, limit, offset } = input;

    let query = supabaseAdmin
      .from("school_public_profiles")
      .select("tenant_id, name, slug, description, logo_url, location, activity_level, total_students, is_public, school_discovery_metrics(views_count, followers_count, conversion_rate, featured_until, last_activity_at)", { count: "exact" })
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (q && q.trim().length > 0) {
      query = query.or(`name.ilike.%${q.trim()}%,location.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list schools: ${error.message}`);
    }

    return {
      items: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    };
  },

  async searchPublicSchools(input: SearchPublicSchoolsInput) {
    let query = supabaseAdmin
      .from("school_public_profiles")
      .select("tenant_id, name, slug, description, logo_url, location, activity_level, total_students, is_public, school_discovery_metrics(views_count, followers_count, conversion_rate, featured_until, last_activity_at)", { count: "exact" })
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.q) {
      const q = input.q.trim();
      if (q.length > 0) {
        query = query.or(`name.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%`);
      }
    }

    if (input.city && input.city.trim().length > 0) {
      query = query.ilike("location", `%${input.city.trim()}%`);
    }

    if (typeof input.minStudents === "number") {
      query = query.gte("total_students", input.minStudents);
    }

    if (typeof input.maxStudents === "number") {
      query = query.lte("total_students", input.maxStudents);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to search public schools: ${error.message}`);
    }

    return {
      items: data ?? [],
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async listTrendingSchools(input: ListTrendingSchoolsInput) {
    const { data, error, count } = await supabaseAdmin
      .from("school_public_profiles")
      .select("tenant_id, name, slug, description, logo_url, location, activity_level, total_students, is_public, school_discovery_metrics(views_count, followers_count, conversion_rate, featured_until, last_activity_at)", { count: "exact" })
      .eq("is_public", true)
      .limit(500);

    if (error) {
      throw new Error(`Failed to list trending schools: ${error.message}`);
    }

    const ranked = ((data ?? []) as PublicSchoolRow[])
      .map((school) => {
        const metrics = normalizeMetrics(school.school_discovery_metrics);
        const engagementScore = Number(((metrics.followers_count * 0.6) + (metrics.views_count * 0.15) + (metrics.conversion_rate * 8)).toFixed(2));
        const activityScore = Number(((school.total_students * 0.2) + (metrics.followers_count * 0.4) + (metrics.views_count * 0.1)).toFixed(2));
        return {
          ...school,
          metrics,
          engagementScore,
          activityScore,
        };
      })
      .sort((a, b) => {
        if (input.orderBy === "students") return b.total_students - a.total_students;
        if (input.orderBy === "followers") return b.metrics.followers_count - a.metrics.followers_count;
        if (input.orderBy === "views") return b.metrics.views_count - a.metrics.views_count;
        if (input.orderBy === "activity") return b.activityScore - a.activityScore;
        return b.engagementScore - a.engagementScore;
      });

    const start = input.offset;
    const end = input.offset + input.limit;
    return {
      items: ranked.slice(start, end),
      total: count ?? ranked.length,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async listRecommendedSchools(input: ListRecommendedSchoolsInput) {
    const searched = await this.searchPublicSchools({
      q: undefined,
      city: input.city,
      level: input.level,
      minStudents: input.minStudents,
      maxStudents: input.maxStudents,
      limit: 200,
      offset: 0,
    });

    const stylesQuery = input.styles.map((style) => style.trim().toLowerCase()).filter((style) => style.length > 0);
    const ranked = ((searched.items ?? []) as PublicSchoolRow[])
      .map((school) => {
        const metrics = normalizeMetrics(school.school_discovery_metrics);
        const nameMatch = stylesQuery.length > 0
          ? stylesQuery.some((style) => `${school.name} ${school.description ?? ""}`.toLowerCase().includes(style))
          : false;
        const locationBoost = input.city && school.location?.toLowerCase().includes(input.city.toLowerCase()) ? 25 : 0;
        const styleBoost = nameMatch ? 20 : 0;
        const score = Number((
          (metrics.conversion_rate * 5) +
          (metrics.followers_count * 0.35) +
          (metrics.views_count * 0.08) +
          (school.total_students * 0.15) +
          locationBoost +
          styleBoost
        ).toFixed(2));
        return {
          ...school,
          recommendation_score: score,
          school_discovery_metrics: metrics,
        };
      })
      .sort((a, b) => (b.recommendation_score as number) - (a.recommendation_score as number));

    return {
      items: ranked.slice(input.offset, input.offset + input.limit),
      total: ranked.length,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async getPublicSchoolBySlug(slug: string) {
    const { data, error } = await supabaseAdmin
      .from("school_public_profiles")
      .select("tenant_id, name, slug, description, logo_url, location, activity_level, total_students, is_public, school_discovery_metrics(views_count, followers_count, conversion_rate, featured_until, last_activity_at)")
      .eq("slug", slug)
      .eq("is_public", true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch school profile: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    await supabaseAdmin
      .from("school_discovery_metrics")
      .update({
        views_count: ((data.school_discovery_metrics as { views_count?: number } | null)?.views_count ?? 0) + 1,
        last_activity_at: new Date().toISOString(),
      })
      .eq("tenant_id", data.tenant_id);

    return data;
  },

  async getPublicSchoolMetricsBySlug(slug: string) {
    const school = await this.getPublicSchoolBySlug(slug);
    if (!school) {
      return null;
    }

    const metrics = await calculatePublicSchoolMetrics(school.tenant_id);
    return {
      tenantId: school.tenant_id,
      slug: school.slug,
      name: school.name,
      activeStudents: metrics.activeStudents,
      postsRecent: metrics.postsRecent,
      eventsRecent: metrics.eventsRecent,
      engagementRate: metrics.engagementRate,
      postsPerWeek: metrics.postsPerWeek,
      studentGrowthRate: metrics.studentGrowthRate,
      eventsGrowthRate: metrics.eventsGrowthRate,
      followersCount: metrics.followersCount,
      viewsCount: metrics.viewsCount,
      conversionRate: metrics.conversionRate,
      lastActivityAt: metrics.lastActivityAt,
      trendingBadge: metrics.engagementRate >= 20 || metrics.postsRecent >= 6,
    };
  },

  async comparePublicSchools(input: CompareSchoolsInput) {
    const { data, error } = await supabaseAdmin
      .from("school_public_profiles")
      .select("tenant_id, name, slug, description, logo_url, location, activity_level, total_students, is_public, school_discovery_metrics(views_count, followers_count, conversion_rate, featured_until, last_activity_at)")
      .in("slug", input.slugs)
      .eq("is_public", true);

    if (error) {
      throw new Error(`Failed to compare schools: ${error.message}`);
    }

    const schoolsBySlug = new Map(((data ?? []) as PublicSchoolRow[]).map((school) => [school.slug, school]));
    const ordered = input.slugs
      .map((slug) => schoolsBySlug.get(slug))
      .filter((school): school is PublicSchoolRow => Boolean(school));

    const compared = await Promise.all(
      ordered.map(async (school) => ({
        school,
        metrics: await calculatePublicSchoolMetrics(school.tenant_id),
      }))
    );

    return compared;
  },

  async getEcosystemStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [schoolsTotal, activeSchools, dancersTotal, postsTotal, eventsPublished, followsTotal] = await Promise.all([
      supabaseAdmin
        .from("school_public_profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true),
      supabaseAdmin
        .from("school_discovery_metrics")
        .select("id", { count: "exact", head: true })
        .gte("last_activity_at", thirtyDaysAgo),
      supabaseAdmin
        .from("student_profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabaseAdmin
        .from("school_feed_posts")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabaseAdmin
        .from("student_followers")
        .select("id", { count: "exact", head: true }),
    ]);

    const schools = schoolsTotal.count ?? 0;
    const active = activeSchools.count ?? 0;
    return {
      totalSchools: schools,
      activeSchools: active,
      activeSchoolsRate: schools > 0 ? Number(((active / schools) * 100).toFixed(2)) : 0,
      totalDancers: dancersTotal.count ?? 0,
      totalPosts: postsTotal.count ?? 0,
      totalPublishedEvents: eventsPublished.count ?? 0,
      totalFollowConnections: followsTotal.count ?? 0,
      updatedAt: new Date().toISOString(),
    };
  },

  async listPublicFeed(input: {
    tenantId?: string;
    tenantIds?: string[];
    type?: "class" | "event" | "achievement" | "announcement" | "choreography";
    limit: number;
    offset: number;
    viewerUserId?: string;
    viewerTenantIds?: string[];
  }) {
    const tenantIds = Array.from(new Set((input.viewerTenantIds ?? []).filter((value) => /^[0-9a-f-]{36}$/i.test(value))));
    const visibilityClauses = ["visibility_scope.eq.public", "visibility_scope.is.null"];

    if (input.viewerUserId) {
      visibilityClauses.push("visibility_scope.eq.followers");
    }

    if (tenantIds.length > 0) {
      visibilityClauses.push(`and(visibility_scope.eq.school,tenant_id.in.(${tenantIds.join(",")}))`);
    }

    let query = supabaseAdmin
      .from("school_feed_posts")
      .select("id, tenant_id, author_type, author_name, author_avatar_url, type, content, image_urls, video_url, is_public, visibility_scope, likes_count, saves_count, published_at", { count: "exact" })
      .eq("approval_status", "published")
      .or(visibilityClauses.join(","))
      .order("published_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.tenantId) {
      query = query.eq("tenant_id", input.tenantId);
    }

    if (input.tenantIds && input.tenantIds.length > 0) {
      query = query.in("tenant_id", input.tenantIds);
    }

    if (input.type) {
      query = query.eq("type", input.type);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch feed posts: ${error.message}`);
    }

    const items = await this.attachMediaToPosts((data ?? []) as SchoolFeedPostRow[]);

    return {
      items,
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async listPersonalizedFeed(
    userId: string,
    input: {
      type?: "class" | "event" | "achievement" | "announcement" | "choreography";
      limit: number;
      offset: number;
    }
  ) {
    const own = await this.getOrCreateOwnProfile(userId);

    const [schoolFollows, profileFollows, memberships] = await Promise.all([
      supabaseAdmin
        .from("student_school_follows")
        .select("tenant_id")
        .eq("student_profile_id", own.id),
      supabaseAdmin
        .from("student_followers")
        .select("following_profile_id")
        .eq("follower_profile_id", own.id),
      supabaseAdmin
        .from("tenant_memberships")
        .select("tenant_id")
        .eq("user_id", userId)
        .eq("is_active", true),
    ]);

    if (schoolFollows.error) {
      throw new Error(`Failed to load followed schools: ${schoolFollows.error.message}`);
    }

    if (profileFollows.error) {
      throw new Error(`Failed to load followed profiles: ${profileFollows.error.message}`);
    }

    const followingProfileIds = (profileFollows.data ?? []).map((row) => row.following_profile_id as string);
    let followedProfileTenantIds: string[] = [];

    if (followingProfileIds.length > 0) {
      const { data: profileTenants, error: profileTenantsError } = await supabaseAdmin
        .from("student_profiles")
        .select("tenant_id")
        .in("id", followingProfileIds)
        .not("tenant_id", "is", null);

      if (profileTenantsError) {
        throw new Error(`Failed to resolve followed profile tenants: ${profileTenantsError.message}`);
      }

      followedProfileTenantIds = (profileTenants ?? [])
        .map((row) => row.tenant_id as string | null)
        .filter((value): value is string => Boolean(value));
    }

    const followedSchoolTenantIds = (schoolFollows.data ?? [])
      .map((row) => row.tenant_id as string)
      .filter((value) => /^[0-9a-f-]{36}$/i.test(value));

    const targetTenantIds = Array.from(new Set([...followedSchoolTenantIds, ...followedProfileTenantIds]));
    const viewerTenantIds = Array.from(
      new Set((memberships.data ?? []).map((row) => row.tenant_id as string).filter((value) => /^[0-9a-f-]{36}$/i.test(value)))
    );

    const feed = await this.listPublicFeed({
      tenantIds: targetTenantIds.length > 0 ? targetTenantIds : undefined,
      type: input.type,
      limit: input.limit,
      offset: input.offset,
      viewerUserId: userId,
      viewerTenantIds,
    });

    return {
      ...feed,
      personalized: targetTenantIds.length > 0,
      targetTenantIds,
    };
  },

  async listPublicEvents(input: {
    tenantId?: string;
    limit: number;
    offset: number;
    upcomingOnly: boolean;
  }) {
    let query = supabaseAdmin
      .from("events")
      .select("id, tenant_id, name, start_date, end_date, location, description, status", { count: "exact" })
      .eq("status", "published")
      .order("start_date", { ascending: true })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.tenantId) {
      query = query.eq("tenant_id", input.tenantId);
    }

    if (input.upcomingOnly) {
      query = query.gte("start_date", new Date().toISOString().slice(0, 10));
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch public events: ${error.message}`);
    }

    const eventRows = (data ?? []) as EventRow[];
    const tenantIds = Array.from(new Set(eventRows.map((event) => event.tenant_id)));

    let tenantNameById = new Map<string, string>();
    if (tenantIds.length > 0) {
      const { data: schools, error: schoolsError } = await supabaseAdmin
        .from("school_public_profiles")
        .select("tenant_id, name")
        .in("tenant_id", tenantIds)
        .eq("is_public", true);

      if (schoolsError) {
        throw new Error(`Failed to fetch schools for events: ${schoolsError.message}`);
      }

      tenantNameById = new Map(
        (schools ?? []).map((school) => [school.tenant_id as string, school.name as string])
      );
    }

    return {
      items: eventRows
        .filter((event) => tenantNameById.has(event.tenant_id))
        .map((event) => ({
          ...event,
          school_name: tenantNameById.get(event.tenant_id) ?? "Escuela",
        })),
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async ensureMediaAssetsForTenant(tenantId: string, mediaIds: string[]) {
    if (mediaIds.length === 0) {
      return [] as MediaAssetRow[];
    }

    const uniqueIds = Array.from(new Set(mediaIds));
    const { data, error } = await supabaseAdmin
      .from("media_assets")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("id", uniqueIds);

    if (error) {
      throw new Error(`Failed to validate media assets: ${error.message}`);
    }

    const assets = (data ?? []) as MediaAssetRow[];
    if (assets.length !== uniqueIds.length) {
      throw new Error("One or more media assets are invalid for this tenant");
    }

    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    return uniqueIds
      .map((id) => assetById.get(id))
      .filter((asset): asset is MediaAssetRow => Boolean(asset));
  },

  buildMediaUrlsFromAssets(assets: MediaAssetRow[]) {
    const imageUrls = assets.filter((asset) => asset.kind === "image").map((asset) => asset.url);
    const videoAsset = assets.find((asset) => asset.kind === "video") ?? null;
    const videoUrl = videoAsset?.url ?? null;

    return {
      imageUrls,
      videoUrl,
    };
  },

  async syncPostMediaLinks(tenantId: string, postId: string, mediaIds: string[]) {
    await supabaseAdmin
      .from("school_feed_post_media")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("post_id", postId);

    if (mediaIds.length === 0) {
      return;
    }

    const rows = mediaIds.map((mediaId, index) => ({
      tenant_id: tenantId,
      post_id: postId,
      media_id: mediaId,
      sort_order: index,
    }));

    const { error } = await supabaseAdmin.from("school_feed_post_media").insert(rows);
    if (error) {
      throw new Error(`Failed to save post media links: ${error.message}`);
    }
  },

  async attachMediaToPosts(items: SchoolFeedPostRow[]) {
    if (items.length === 0) {
      return [] as Array<SchoolFeedPostRow & { media_ids: string[]; media_items: MediaAssetRow[] }>;
    }

    const postIds = items.map((item) => item.id);
    const { data, error } = await supabaseAdmin
      .from("school_feed_post_media")
      .select("post_id, media_id, sort_order, media_assets(*)")
      .in("post_id", postIds)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(`Failed to load post media links: ${error.message}`);
    }

    const links = (data ?? []) as FeedPostMediaLinkRow[];
    const linksByPostId = new Map<string, FeedPostMediaLinkRow[]>();

    for (const link of links) {
      const bucket = linksByPostId.get(link.post_id) ?? [];
      bucket.push(link);
      linksByPostId.set(link.post_id, bucket);
    }

    return items.map((item) => {
      const postLinks = linksByPostId.get(item.id) ?? [];
      const mediaItems = postLinks
        .map((link) => (Array.isArray(link.media_assets) ? link.media_assets[0] : link.media_assets) ?? null)
        .filter((asset): asset is MediaAssetRow => asset !== null);

      return {
        ...item,
        media_ids: mediaItems.map((asset) => asset.id),
        media_items: mediaItems,
      };
    });
  },

  async ensurePortalMediaBucket() {
    const existingBucket = await supabaseAdmin.storage.getBucket(PORTAL_MEDIA_BUCKET);

    if (existingBucket.error && !existingBucket.error.message.toLowerCase().includes("not found")) {
      throw new Error(`Failed to inspect media bucket: ${existingBucket.error.message}`);
    }

    if (existingBucket.data) {
      return;
    }

    const { error } = await supabaseAdmin.storage.createBucket(PORTAL_MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: "50MB",
    });

    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new Error(`Failed to create media bucket: ${error.message}`);
    }
  },

  async uploadMediaAssetFile(input: {
    tenantId: string;
    actorUserId: string;
    file: File;
    kind?: "image" | "video";
    isPublic?: boolean;
  }) {
    await this.ensurePortalMediaBucket();

    const resolvedKind = inferMediaKind(input.kind, input.file.type, input.file.name);
    const normalizedMimeType = (input.file.type || "").toLowerCase();
    if (resolvedKind === "image" && normalizedMimeType && !ALLOWED_IMAGE_MIME_TYPES.has(normalizedMimeType)) {
      throw new Error("Unsupported image format. Use JPG, PNG, WEBP or GIF.");
    }

    if (resolvedKind === "video" && normalizedMimeType && !ALLOWED_VIDEO_MIME_TYPES.has(normalizedMimeType)) {
      throw new Error("Unsupported video format. Use MP4, WEBM or MOV.");
    }

    const maxAllowedBytes = resolvedKind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (input.file.size > maxAllowedBytes) {
      throw new Error(
        resolvedKind === "video"
          ? "Video file is too large. Maximum size is 50MB."
          : "Image file is too large. Maximum size is 15MB."
      );
    }

    const extension = input.file.name.includes(".") ? input.file.name.split(".").pop() : undefined;
    const fileName = extension ? `${randomUUID()}.${extension}` : randomUUID();
    const path = `${input.tenantId}/${new Date().toISOString().slice(0, 10)}/${fileName}`;
    const contentType = normalizedMimeType || (resolvedKind === "video" ? "video/mp4" : "image/jpeg");

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PORTAL_MEDIA_BUCKET)
      .upload(path, input.file, {
        cacheControl: "3600",
        upsert: true,
        contentType,
      });

    if (uploadError) {
      throw new Error(`Failed to upload media file: ${uploadError.message}`);
    }

    const publicUrl = supabaseAdmin.storage.from(PORTAL_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
    const thumbnailUrl = resolvedKind === "image"
      ? `${publicUrl}?width=480&quality=70&resize=contain`
      : null;

    const { data, error } = await supabaseAdmin
      .from("media_assets")
      .insert({
        tenant_id: input.tenantId,
        created_by: input.actorUserId,
        kind: resolvedKind,
        provider: "supabase",
        bucket: PORTAL_MEDIA_BUCKET,
        path,
        url: publicUrl,
        thumbnail_url: thumbnailUrl,
        mime_type: contentType,
        size_bytes: input.file.size,
        processing_status: "ready",
        processing_metadata: {
          pipeline: "supabase-storage-transform",
          validation: {
            allowedMimeCheck: true,
            maxBytes: maxAllowedBytes,
          },
          thumbnailParams: resolvedKind === "image" ? { width: 480, quality: 70 } : null,
        },
        is_public: input.isPublic ?? true,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to store media asset metadata: ${error?.message}`);
    }

    return data as MediaAssetRow;
  },

  async createMediaAssetFromUrl(tenantId: string, actorUserId: string, input: UploadMediaFromUrlInput) {
    const resolvedKind = inferMediaKind(input.kind, input.mimeType, input.url);
    const thumbnailUrl = resolvedKind === "image"
      ? `${input.url}?width=480&quality=70&resize=contain`
      : null;

    const { data, error } = await supabaseAdmin
      .from("media_assets")
      .insert({
        tenant_id: tenantId,
        created_by: actorUserId,
        kind: resolvedKind,
        provider: "external",
        bucket: null,
        path: null,
        url: input.url,
        thumbnail_url: thumbnailUrl,
        mime_type: normalizeNullable(input.mimeType),
        size_bytes: input.sizeBytes ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        duration_seconds: input.durationSeconds ?? null,
        processing_status: "ready",
        processing_metadata: {
          source: "url",
          thumbnailParams: resolvedKind === "image" ? { width: 480, quality: 70 } : null,
        },
        is_public: input.isPublic,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create media asset from url: ${error?.message}`);
    }

    return data as MediaAssetRow;
  },

  async getMediaAsset(tenantId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from("media_assets")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load media asset: ${error.message}`);
    }

    if (!data) {
      throw new Error("Media not found");
    }

    return data as MediaAssetRow;
  },

  async deleteMediaAsset(tenantId: string, id: string) {
    const asset = await this.getMediaAsset(tenantId, id);

    if (asset.provider === "supabase" && asset.bucket && asset.path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(asset.bucket)
        .remove([asset.path]);

      if (storageError) {
        throw new Error(`Failed to delete media file: ${storageError.message}`);
      }
    }

    const { error } = await supabaseAdmin
      .from("media_assets")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete media asset: ${error.message}`);
    }

    return { success: true };
  },

  async createFeedPost(tenantId: string, actorUserId: string, input: CreateFeedPostInput) {
    const mediaAssets = await this.ensureMediaAssetsForTenant(tenantId, input.mediaIds ?? []);
    const mediaUrls = this.buildMediaUrlsFromAssets(mediaAssets);
    const mergedImageUrls = Array.from(new Set([...(mediaUrls.imageUrls ?? []), ...(input.imageUrls ?? [])]));
    const resolvedVideoUrl = normalizeNullable(input.videoUrl) ?? mediaUrls.videoUrl;
    const visibilityScope = resolvePostVisibilityScope(input.visibilityScope, input.isPublic);

    const payload = {
      tenant_id: tenantId,
      author_user_id: actorUserId,
      author_type: input.authorType,
      author_name: input.authorName,
      author_avatar_url: normalizeNullable(input.authorAvatarUrl),
      type: input.type,
      content: input.content,
      image_urls: mergedImageUrls,
      video_url: resolvedVideoUrl,
      is_public: visibilityScope === "public",
      visibility_scope: visibilityScope,
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("school_feed_posts")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create feed post: ${error?.message}`);
    }

    await this.syncPostMediaLinks(tenantId, data.id, mediaAssets.map((asset) => asset.id));

    await supabaseAdmin
      .from("school_discovery_metrics")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("tenant_id", tenantId);

    if (input.authorType === "school") {
      await notifySchoolPostPublished({
        tenantId,
        actorUserId,
        postId: data.id,
        postType: input.type,
        visibilityScope,
        previewContent: input.content,
      });
    }

    const [postWithMedia] = await this.attachMediaToPosts([data as SchoolFeedPostRow]);
    return postWithMedia;
  },

  async updateFeedPost(tenantId: string, postId: string, input: UpdateFeedPostInput) {
    const payload: Record<string, unknown> = {};

    const mediaAssets = input.mediaIds !== undefined
      ? await this.ensureMediaAssetsForTenant(tenantId, input.mediaIds)
      : null;
    const mediaUrls = mediaAssets ? this.buildMediaUrlsFromAssets(mediaAssets) : null;

    if (input.authorType !== undefined) payload.author_type = input.authorType;
    if (input.authorName !== undefined) payload.author_name = input.authorName;
    if (input.authorAvatarUrl !== undefined) payload.author_avatar_url = normalizeNullable(input.authorAvatarUrl);
    if (input.type !== undefined) payload.type = input.type;
    if (input.content !== undefined) payload.content = input.content;
    if (input.imageUrls !== undefined || mediaUrls) {
      const imagesFromMedia = mediaUrls?.imageUrls ?? [];
      const imagesFromInput = input.imageUrls ?? [];
      payload.image_urls = Array.from(new Set([...imagesFromMedia, ...imagesFromInput]));
    }
    if (input.videoUrl !== undefined || mediaUrls) {
      payload.video_url = normalizeNullable(input.videoUrl) ?? mediaUrls?.videoUrl ?? null;
    }
    if (input.visibilityScope !== undefined || input.isPublic !== undefined) {
      const visibilityScope = resolvePostVisibilityScope(input.visibilityScope, input.isPublic);
      payload.visibility_scope = visibilityScope;
      payload.is_public = visibilityScope === "public";
    }

    const shouldRepublish =
      input.type !== undefined ||
      input.content !== undefined ||
      input.imageUrls !== undefined ||
      input.videoUrl !== undefined ||
      input.isPublic !== undefined ||
      input.visibilityScope !== undefined;

    if (shouldRepublish) {
      payload.published_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("school_feed_posts")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", postId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update feed post: ${error.message}`);
    }

    if (!data) {
      throw new Error("Post not found");
    }

    if (mediaAssets) {
      await this.syncPostMediaLinks(tenantId, postId, mediaAssets.map((asset) => asset.id));
    }

    const [postWithMedia] = await this.attachMediaToPosts([data as SchoolFeedPostRow]);
    return postWithMedia;
  },

  async deleteFeedPost(tenantId: string, postId: string) {
    const { error } = await supabaseAdmin
      .from("school_feed_posts")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", postId);

    if (error) {
      throw new Error(`Failed to delete feed post: ${error.message}`);
    }

    return { success: true };
  },

  async updateSchoolProfile(tenantId: string, input: SchoolProfileInput) {
    const { error: tenantError } = await supabaseAdmin
      .from("tenants")
      .update({ name: input.name, slug: input.slug })
      .eq("id", tenantId);

    if (tenantError) {
      throw new Error(`Failed to update tenant profile: ${tenantError.message}`);
    }

    const upsertPayload = {
      tenant_id: tenantId,
      name: input.name,
      slug: input.slug,
      description: normalizeNullable(input.description),
      logo_url: normalizeNullable(input.logoUrl),
      location: normalizeNullable(input.location),
      is_public: input.isPublic,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("school_public_profiles")
      .upsert(upsertPayload, { onConflict: "tenant_id" })
      .select("tenant_id, name, slug, description, logo_url, location, is_public")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update school public profile: ${error?.message}`);
    }

    return data;
  },

  async getSchoolAnalytics(tenantId: string) {
    const [students, classes, posts, events, followers] = await Promise.all([
      supabaseAdmin
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      supabaseAdmin
        .from("school_feed_posts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("school_discovery_metrics")
        .select("followers_count, views_count, conversion_rate, last_activity_at")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    return {
      studentsCount: students.count ?? 0,
      activeClassesCount: classes.count ?? 0,
      postsCount: posts.count ?? 0,
      eventsCount: events.count ?? 0,
      followersCount: followers.data?.followers_count ?? 0,
      viewsCount: followers.data?.views_count ?? 0,
      conversionRate: followers.data?.conversion_rate ?? 0,
      lastActivityAt: followers.data?.last_activity_at ?? null,
    };
  },

  async createAnnouncement(tenantId: string, actorUserId: string, input: SchoolAnnouncementInput) {
    const authorName = await resolveSchoolAuthorName(tenantId);
    const urgencyTag = input.isUrgent ? "[URGENTE] " : input.isImportant ? "[IMPORTANTE] " : "";
    const content = `${urgencyTag}${input.title}\n\n${input.content}`.trim();

    const created = await this.createFeedPost(tenantId, actorUserId, {
      authorType: "school",
      authorName,
      type: "announcement",
      content,
      imageUrls: [],
      videoUrl: null,
      mediaIds: [],
      isPublic: true,
    });

    if (input.notifyAll) {
      const { data: userIds } = await supabaseAdmin
        .from("tenant_memberships")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      const recipients = Array.from(new Set((userIds ?? []).map((row) => row.user_id as string)));
      await Promise.all(
        recipients.map((recipientId) =>
          createNotification({
            tenantId,
            userId: recipientId,
            type: input.isUrgent ? PORTAL_NOTIFICATION_TYPES.ANNOUNCEMENT_URGENT : PORTAL_NOTIFICATION_TYPES.ANNOUNCEMENT,
            title: input.title,
            message: input.content,
            actionUrl: "/portal/app/feed",
            metadata: {
              postId: created.id,
              isImportant: input.isImportant,
              isUrgent: input.isUrgent,
            },
          })
        )
      );
    }

    return {
      ...created,
      announcementTitle: input.title,
      isImportant: input.isImportant,
      isUrgent: input.isUrgent,
    };
  },

  async listSchoolAnnouncements(tenantId: string, limit = 50) {
    const { data, error } = await supabaseAdmin
      .from("school_feed_posts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("type", "announcement")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list announcements: ${error.message}`);
    }

    return (data ?? []) as SchoolFeedPostRow[];
  },

  async listSchoolFeedPosts(input: {
    tenantId: string;
    type?: "class" | "event" | "achievement" | "announcement" | "choreography";
    approvalStatus?: "draft" | "pending_approval" | "published" | "rejected";
    limit: number;
    offset: number;
  }) {
    let query = supabaseAdmin
      .from("school_feed_posts")
      .select("*", { count: "exact" })
      .eq("tenant_id", input.tenantId)
      .order("published_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.type) {
      query = query.eq("type", input.type);
    }

    if (input.approvalStatus) {
      query = query.eq("approval_status", input.approvalStatus);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to list school feed posts: ${error.message}`);
    }

    const items = await this.attachMediaToPosts((data ?? []) as SchoolFeedPostRow[]);

    return {
      items,
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async listStudentAnnouncements(userId: string, tenantId?: string) {
    const resolvedTenantId = tenantId ?? (await resolveDefaultTenantId(userId));
    if (!resolvedTenantId) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("school_feed_posts")
      .select("*")
      .eq("tenant_id", resolvedTenantId)
      .eq("type", "announcement")
      .eq("is_public", true)
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to list student announcements: ${error.message}`);
    }

    return (data ?? []) as SchoolFeedPostRow[];
  },

  async createAlbum(tenantId: string, actorUserId: string, input: CreateAlbumInput) {
    const { data, error } = await supabaseAdmin
      .from("school_gallery_albums")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: normalizeNullable(input.description),
        event_id: input.eventId ?? null,
        is_public: input.isPublic,
        created_by: actorUserId,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create album: ${error?.message}`);
    }

    return data as SchoolGalleryAlbumRow;
  },

  async listAlbums(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from("school_gallery_albums")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list albums: ${error.message}`);
    }

    return (data ?? []) as SchoolGalleryAlbumRow[];
  },

  async uploadPhoto(tenantId: string, actorUserId: string, input: UploadPhotoInput) {
    const { data: album, error: albumError } = await supabaseAdmin
      .from("school_gallery_albums")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", input.albumId)
      .maybeSingle();

    if (albumError || !album) {
      throw new Error("Album not found");
    }

    const { data, error } = await supabaseAdmin
      .from("school_gallery_photos")
      .insert({
        tenant_id: tenantId,
        album_id: input.albumId,
        image_url: input.imageUrl,
        caption: normalizeNullable(input.caption),
        event_id: input.eventId ?? null,
        is_public: input.isPublic,
        created_by: actorUserId,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upload photo: ${error?.message}`);
    }

    return data as SchoolGalleryPhotoRow;
  },

  async listPhotosByAlbum(input: { tenantId?: string; albumId: string; limit: number; offset: number }) {
    let query = supabaseAdmin
      .from("school_gallery_photos")
      .select("*", { count: "exact" })
      .eq("album_id", input.albumId)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.tenantId) {
      query = query.eq("tenant_id", input.tenantId);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to list album photos: ${error.message}`);
    }

    return {
      items: (data ?? []) as SchoolGalleryPhotoRow[],
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async listTeacherClasses(userId: string, email: string | undefined, tenantId?: string) {
    const teacher = await resolveTeacherByUser(userId, email, tenantId);

    const { data, error } = await supabaseAdmin
      .from("classes")
      .select("id, tenant_id, name, room_id, discipline_id, category_id, status, capacity, class_teachers(teacher_id, teachers(id, name)), teachers(id, name)")
      .eq("tenant_id", teacher.tenant_id)
      .or(`teacher_id.eq.${teacher.id},class_teachers.teacher_id.eq.${teacher.id}`)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to list teacher classes: ${error.message}`);
    }

    return {
      teacher,
      classes: ((data ?? []) as TeacherClassRow[]).map((item) => ({
        ...item,
        teachers: normalizeTeacherRows(item),
      })),
    };
  },

  async listTeacherSchedule(userId: string, email: string | undefined, tenantId?: string) {
    const { teacher, classes } = await this.listTeacherClasses(userId, email, tenantId);
    const classIds = classes.map((item) => item.id);

    if (classIds.length === 0) {
      return { teacher, schedule: [] };
    }

    const { data, error } = await supabaseAdmin
      .from("class_schedules")
      .select("id, class_id, room_id, weekday, start_time, end_time, is_active")
      .in("class_id", classIds)
      .eq("tenant_id", teacher.tenant_id)
      .eq("is_active", true)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error(`Failed to list teacher schedule: ${error.message}`);
    }

    const classNameById = new Map(classes.map((item) => [item.id, item.name]));

    return {
      teacher,
      schedule: (data ?? []).map((slot) => ({
        ...slot,
        class_name: classNameById.get(slot.class_id) ?? "Clase",
      })),
    };
  },

  async listTeacherClassStudents(
    userId: string,
    email: string | undefined,
    classId: string,
    tenantId?: string
  ) {
    const { teacher, classes } = await this.listTeacherClasses(userId, email, tenantId);
    const targetClass = classes.find((item) => item.id === classId);

    if (!targetClass) {
      throw new Error("Class not assigned to teacher");
    }

    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("id, status, student_id, students(name, email, phone)")
      .eq("tenant_id", teacher.tenant_id)
      .eq("class_id", classId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to list class students: ${error.message}`);
    }

    return {
      teacher,
      class: {
        id: targetClass.id,
        name: targetClass.name,
      },
      students: (data ?? []).map((row) => {
        const student = Array.isArray(row.students) ? row.students[0] : row.students;
        return {
          enrollmentId: row.id,
          studentId: row.student_id,
          name: student?.name ?? "Alumno",
          email: student?.email ?? null,
          phone: student?.phone ?? null,
        };
      }),
    };
  },

  async createTeacherPost(userId: string, email: string | undefined, input: TeacherPostInput) {
    const teacher = await resolveTeacherByUser(userId, email, input.tenantId);
    const approvalStatus = input.requiresApproval ? "pending_approval" : "published";
    const mediaAssets = await this.ensureMediaAssetsForTenant(teacher.tenant_id, input.mediaIds ?? []);
    const mediaUrls = this.buildMediaUrlsFromAssets(mediaAssets);
    const mergedImageUrls = Array.from(new Set([...(mediaUrls.imageUrls ?? []), ...(input.imageUrls ?? [])]));
    const resolvedVideoUrl = normalizeNullable(input.videoUrl) ?? mediaUrls.videoUrl;
    const visibilityScope = resolvePostVisibilityScope(input.visibilityScope, input.isPublic);

    const { data, error } = await supabaseAdmin
      .from("school_feed_posts")
      .insert({
        tenant_id: teacher.tenant_id,
        author_user_id: userId,
        author_type: "teacher",
        author_name: teacher.name,
        type: input.type,
        content: input.content,
        image_urls: mergedImageUrls,
        video_url: resolvedVideoUrl,
        is_public: visibilityScope === "public",
        visibility_scope: visibilityScope,
        approval_status: approvalStatus,
        published_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create teacher post: ${error?.message}`);
    }

    await this.syncPostMediaLinks(teacher.tenant_id, data.id, mediaAssets.map((asset) => asset.id));

    const [postWithMedia] = await this.attachMediaToPosts([data as SchoolFeedPostRow]);
    return postWithMedia;
  },

  async followSchool(userId: string, tenantId: string) {
    const own = await this.getOrCreateOwnProfile(userId);

    const { data: school, error: schoolError } = await supabaseAdmin
      .from("school_public_profiles")
      .select("tenant_id, is_public")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (schoolError || !school) {
      throw new Error("School not found");
    }

    if (!school.is_public) {
      throw new Error("School is not publicly followable");
    }

    const { error } = await supabaseAdmin
      .from("student_school_follows")
      .insert({
        student_profile_id: own.id,
        tenant_id: tenantId,
        source: "manual",
      });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(`Failed to follow school: ${error.message}`);
    }

    return { success: true };
  },

  async unfollowSchool(userId: string, tenantId: string) {
    const own = await this.getOrCreateOwnProfile(userId);

    const { error } = await supabaseAdmin
      .from("student_school_follows")
      .delete()
      .eq("student_profile_id", own.id)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Failed to unfollow school: ${error.message}`);
    }

    return { success: true };
  },

  async listFollowedSchools(userId: string, limit = 50) {
    const own = await this.getOrCreateOwnProfile(userId);

    const { data: follows, error: followsError } = await supabaseAdmin
      .from("student_school_follows")
      .select("tenant_id, created_at")
      .eq("student_profile_id", own.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (followsError) {
      throw new Error(`Failed to load followed schools: ${followsError.message}`);
    }

    const followRows = follows ?? [];
    const tenantIds = Array.from(new Set(followRows.map((row) => row.tenant_id as string)));
    if (tenantIds.length === 0) {
      return [];
    }

    const { data: schools, error: schoolsError } = await supabaseAdmin
      .from("school_public_profiles")
      .select("tenant_id, name, slug, location, logo_url, is_public")
      .in("tenant_id", tenantIds);

    if (schoolsError) {
      throw new Error(`Failed to load followed school profiles: ${schoolsError.message}`);
    }

    const schoolByTenant = new Map((schools ?? []).map((school) => [school.tenant_id as string, school]));

    return followRows
      .map((row) => {
        const school = schoolByTenant.get(row.tenant_id as string);
        if (!school) return null;

        return {
          tenantId: row.tenant_id as string,
          createdAt: row.created_at as string,
          school: {
            tenantId: school.tenant_id as string,
            name: school.name as string,
            slug: school.slug as string,
            location: (school.location as string | null | undefined) ?? null,
            logoUrl: (school.logo_url as string | null | undefined) ?? null,
            isPublic: Boolean(school.is_public),
          },
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  },

  async getPortalRoleContext(userId: string) {
    const [memberships, students, teachers] = await Promise.all([
      supabaseAdmin
        .from("tenant_memberships")
        .select("tenant_id, role, organization_role")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabaseAdmin
        .from("students")
        .select("id, tenant_id")
        .eq("user_id", userId),
      supabaseAdmin
        .from("teachers")
        .select("id, tenant_id")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

    if (memberships.error) {
      throw new Error(`Failed to resolve portal memberships: ${memberships.error.message}`);
    }

    if (students.error) {
      throw new Error(`Failed to resolve student roles: ${students.error.message}`);
    }

    if (teachers.error) {
      throw new Error(`Failed to resolve teacher roles: ${teachers.error.message}`);
    }

    const membershipRows = memberships.data ?? [];
    const studentTenantIds = Array.from(new Set((students.data ?? []).map((row) => row.tenant_id as string)));
    const teacherTenantIds = Array.from(new Set((teachers.data ?? []).map((row) => row.tenant_id as string)));
    const adminTenantIds = membershipRows
      .filter((row) => row.role === "owner" || row.role === "admin" || row.role === "staff")
      .map((row) => row.tenant_id as string);

    return {
      userId,
      tenantMemberships: membershipRows.map((row) => ({
        tenantId: row.tenant_id as string,
        role: row.role as "owner" | "admin" | "staff",
        organizationRole: (row.organization_role as "owner" | "admin" | "manager" | "member" | null) ?? null,
      })),
      roleProjection: {
        isStudent: studentTenantIds.length > 0,
        isTeacher: teacherTenantIds.length > 0,
        isSchoolAdmin: adminTenantIds.length > 0,
        studentTenantIds,
        teacherTenantIds,
        adminTenantIds: Array.from(new Set(adminTenantIds)),
      },
    };
  },

  async inviteStudentsToSchool(
    tenantId: string,
    invitedByUserId: string,
    input: {
      emails: string[];
      message?: string | null;
      expiresInDays: number;
    }
  ) {
    const uniqueEmails = Array.from(
      new Set(
        input.emails
          .map((email) => email.trim().toLowerCase())
          .filter((email) => email.length > 0)
      )
    );

    const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    const invited: Array<{
      id: string;
      email: string;
      code: string;
      status: "pending" | "accepted" | "revoked" | "expired";
      expiresAt: string | null;
      createdAt: string;
    }> = [];
    const failed: Array<{ email: string; reason: string }> = [];

    for (const email of uniqueEmails) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("school_student_invitations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("invited_email", email)
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (existingError) {
        failed.push({ email, reason: existingError.message });
        continue;
      }

      if (existing?.id) {
        failed.push({ email, reason: "already_pending" });
        continue;
      }

      const { data, error } = await supabaseAdmin
        .from("school_student_invitations")
        .insert({
          tenant_id: tenantId,
          invited_email: email,
          invitation_code: generateInvitationCode(),
          message: normalizeNullable(input.message),
          invited_by_user_id: invitedByUserId,
          status: "pending",
          expires_at: expiresAt,
        })
        .select("id, invited_email, invitation_code, status, expires_at, created_at")
        .single();

      if (error || !data) {
        failed.push({ email, reason: error?.message ?? "insert_failed" });
        continue;
      }

      invited.push({
        id: data.id as string,
        email: data.invited_email as string,
        code: data.invitation_code as string,
        status: data.status as "pending" | "accepted" | "revoked" | "expired",
        expiresAt: (data.expires_at as string | null | undefined) ?? null,
        createdAt: data.created_at as string,
      });
    }

    return {
      invited,
      failed,
      expiresInDays: input.expiresInDays,
      message: normalizeNullable(input.message),
    };
  },

  async listSchoolInvitations(
    tenantId: string,
    input: {
      status?: "pending" | "accepted" | "revoked" | "expired";
      limit: number;
      offset: number;
    }
  ) {
    let query = supabaseAdmin
      .from("school_student_invitations")
      .select(
        "id, tenant_id, invited_email, invitation_code, status, message, invited_by_user_id, accepted_by_user_id, expires_at, accepted_at, created_at",
        { count: "exact" }
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.status) {
      query = query.eq("status", input.status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list school invitations: ${error.message}`);
    }

    const rows = (data ?? []) as SchoolInvitationRow[];
    return {
      items: rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        invitedEmail: row.invited_email,
        code: row.invitation_code,
        status: row.status,
        message: row.message,
        invitedByUserId: row.invited_by_user_id,
        acceptedByUserId: row.accepted_by_user_id,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        createdAt: row.created_at,
      })),
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async acceptSchoolInvitation(userId: string, code: string) {
    const normalizedCode = code.trim().toUpperCase();
    const { data: invitation, error } = await supabaseAdmin
      .from("school_student_invitations")
      .select("id, tenant_id, invited_email, invitation_code, status, expires_at")
      .eq("invitation_code", normalizedCode)
      .eq("status", "pending")
      .maybeSingle();

    if (error || !invitation) {
      throw new Error("Invitation not found");
    }

    const expiresAt = (invitation.expires_at as string | null | undefined) ?? null;
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      await supabaseAdmin
        .from("school_student_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      throw new Error("Invitation expired");
    }

    const userResponse = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = userResponse.data.user?.email?.trim().toLowerCase();
    const invitedEmail = String(invitation.invited_email ?? "").trim().toLowerCase();

    if (!userEmail || userEmail !== invitedEmail) {
      throw new Error("Invitation does not match authenticated account email");
    }

    const own = await this.getOrCreateOwnProfile(userId);
    const tenantId = invitation.tenant_id as string;

    await supabaseAdmin
      .from("student_school_follows")
      .insert({
        student_profile_id: own.id,
        tenant_id: tenantId,
        source: "invitation",
      });

    const acceptedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("school_student_invitations")
      .update({
        status: "accepted",
        accepted_by_user_id: userId,
        accepted_at: acceptedAt,
      })
      .eq("id", invitation.id)
      .eq("status", "pending");

    if (updateError) {
      throw new Error(`Failed to accept invitation: ${updateError.message}`);
    }

    await createNotification({
      tenantId,
      userId,
      type: PORTAL_NOTIFICATION_TYPES.SCHOOL_INVITATION_ACCEPTED,
      title: "Escuela conectada",
      message: "Tu invitacion fue aceptada y ya sigues esta escuela.",
      actionUrl: "/portal/home",
      metadata: {
        invitationId: invitation.id,
        tenantId,
      },
    });

    return {
      success: true,
      tenantId,
      invitationId: invitation.id,
      acceptedAt,
    };
  },

  async listEventParticipantsPublic(eventId: string, input: { limit: number; offset: number }) {
    const { data: eventRow, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, tenant_id, status")
      .eq("id", eventId)
      .eq("status", "published")
      .maybeSingle();

    if (eventError || !eventRow) {
      throw new Error("Event not found");
    }

    const { data: school, error: schoolError } = await supabaseAdmin
      .from("school_public_profiles")
      .select("tenant_id")
      .eq("tenant_id", eventRow.tenant_id)
      .eq("is_public", true)
      .maybeSingle();

    if (schoolError || !school) {
      throw new Error("Event is not publicly available");
    }

    const { data: attendanceRows, error: attendanceError } = await supabaseAdmin
      .from("student_event_attendance")
      .select("student_id, confirmed_at")
      .eq("tenant_id", eventRow.tenant_id)
      .eq("event_id", eventId)
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (attendanceError) {
      throw new Error(`Failed to list event participants: ${attendanceError.message}`);
    }

    const pageStudentIds = Array.from(
      new Set((attendanceRows ?? []).map((row) => row.student_id as string).filter((value) => value.length > 0))
    );

    let profilesByStudentId = new Map<string, Record<string, unknown>>();
    if (pageStudentIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("student_profiles")
        .select("id, student_id, display_name, stage_name, avatar_url, city")
        .eq("public_profile", true)
        .in("student_id", pageStudentIds);

      if (profilesError) {
        throw new Error(`Failed to load participant profiles: ${profilesError.message}`);
      }

      profilesByStudentId = new Map(
        (profiles ?? []).map((profile) => [String(profile.student_id), profile as Record<string, unknown>])
      );
    }

    const { data: allAttendanceRows, error: allAttendanceError } = await supabaseAdmin
      .from("student_event_attendance")
      .select("student_id")
      .eq("tenant_id", eventRow.tenant_id)
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    if (allAttendanceError) {
      throw new Error(`Failed to compute participants total: ${allAttendanceError.message}`);
    }

    const allStudentIds = Array.from(
      new Set((allAttendanceRows ?? []).map((row) => row.student_id as string).filter((value) => value.length > 0))
    );

    let total = 0;
    if (allStudentIds.length > 0) {
      const { count, error: totalError } = await supabaseAdmin
        .from("student_profiles")
        .select("id", { count: "exact", head: true })
        .eq("public_profile", true)
        .in("student_id", allStudentIds);

      if (totalError) {
        throw new Error(`Failed to compute public participants total: ${totalError.message}`);
      }

      total = count ?? 0;
    }

    return {
      items: (attendanceRows ?? [])
        .map((row) => {
          const profile = profilesByStudentId.get(String(row.student_id));
          if (!profile) {
            return null;
          }

          return {
            profileId: String(profile.id ?? ""),
            studentId: String(row.student_id ?? ""),
            displayName: String(profile.display_name ?? "Bailarin"),
            stageName: (profile.stage_name as string | null | undefined) ?? null,
            avatarUrl: (profile.avatar_url as string | null | undefined) ?? null,
            city: (profile.city as string | null | undefined) ?? null,
            confirmedAt: (row.confirmed_at as string | null | undefined) ?? null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async listEventMediaPublic(eventId: string, input: { limit: number; offset: number }) {
    const { data: eventRow, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, tenant_id, status")
      .eq("id", eventId)
      .eq("status", "published")
      .maybeSingle();

    if (eventError || !eventRow) {
      throw new Error("Event not found");
    }

    const { data: school, error: schoolError } = await supabaseAdmin
      .from("school_public_profiles")
      .select("tenant_id")
      .eq("tenant_id", eventRow.tenant_id)
      .eq("is_public", true)
      .maybeSingle();

    if (schoolError || !school) {
      throw new Error("Event is not publicly available");
    }

    const { data, error, count } = await supabaseAdmin
      .from("event_media")
      .select(
        "id, event_id, media_id, sort_order, created_at, media_assets(id, tenant_id, kind, provider, bucket, path, url, thumbnail_url, mime_type, size_bytes, width, height, duration_seconds, processing_status, processing_metadata, is_public, created_at, updated_at)",
        { count: "exact" }
      )
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      throw new Error(`Failed to list event media: ${error.message}`);
    }

    const rows = (data ?? []) as EventMediaLinkRow[];

    return {
      items: rows
        .map((row) => {
          const media = Array.isArray(row.media_assets) ? row.media_assets[0] : row.media_assets;
          if (!media) {
            return null;
          }

          return {
            id: row.id,
            eventId: row.event_id,
            mediaId: row.media_id,
            sortOrder: row.sort_order,
            createdAt: row.created_at,
            media: {
              id: media.id,
              tenant_id: media.tenant_id,
              kind: media.kind,
              provider: media.provider,
              bucket: media.bucket,
              path: media.path,
              url: media.url,
              thumbnail_url: media.thumbnail_url,
              mime_type: media.mime_type,
              size_bytes: media.size_bytes,
              width: media.width,
              height: media.height,
              duration_seconds: media.duration_seconds,
              processing_status: media.processing_status,
              processing_metadata: media.processing_metadata,
              is_public: media.is_public,
              created_at: media.created_at,
              updated_at: media.updated_at,
            },
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async attachEventMedia(tenantId: string, userId: string, eventId: string, mediaIds: string[]) {
    const { data: eventRow, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !eventRow) {
      throw new Error("Event not found");
    }

    const assets = await this.ensureMediaAssetsForTenant(tenantId, mediaIds);
    if (assets.length === 0) {
      return { success: true, attached: 0 };
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("event_media")
      .select("sort_order")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to resolve event media order: ${existingError.message}`);
    }

    const baseOrder = typeof existing?.sort_order === "number" ? existing.sort_order + 1 : 0;
    const rows = assets.map((asset, index) => ({
      tenant_id: tenantId,
      event_id: eventId,
      media_id: asset.id,
      uploaded_by_user_id: userId,
      sort_order: baseOrder + index,
    }));

    const { error } = await supabaseAdmin
      .from("event_media")
      .upsert(rows, { onConflict: "event_id,media_id", ignoreDuplicates: true });

    if (error) {
      throw new Error(`Failed to attach event media: ${error.message}`);
    }

    return {
      success: true,
      attached: rows.length,
    };
  },

  async createContentReport(
    userId: string,
    input: {
      contentType: "post" | "profile";
      contentId: string;
      reason: "inappropriate" | "spam" | "harassment" | "minor_safety" | "other";
      description?: string | null;
    }
  ) {
    let tenantId: string;
    let ownerUserId: string | null = null;

    if (input.contentType === "post") {
      const { data: post, error: postError } = await supabaseAdmin
        .from("school_feed_posts")
        .select("id, tenant_id, author_user_id")
        .eq("id", input.contentId)
        .maybeSingle();

      if (postError || !post) {
        throw new Error("Content not found");
      }

      tenantId = post.tenant_id as string;
      ownerUserId = (post.author_user_id as string | null | undefined) ?? null;
    } else {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("student_profiles")
        .select("id, tenant_id, user_id")
        .eq("id", input.contentId)
        .eq("is_active", true)
        .maybeSingle();

      if (profileError || !profile || !profile.tenant_id) {
        throw new Error("Content not found");
      }

      tenantId = profile.tenant_id as string;
      ownerUserId = (profile.user_id as string | null | undefined) ?? null;
    }

    if (ownerUserId && ownerUserId === userId) {
      throw new Error("You cannot report your own content");
    }

    const { data: report, error: insertError } = await supabaseAdmin
      .from("content_reports")
      .insert({
        tenant_id: tenantId,
        content_type: input.contentType,
        content_id: input.contentId,
        reported_by_user_id: userId,
        reason: input.reason,
        description: normalizeNullable(input.description),
        status: "open",
        action_taken: "none",
      })
      .select("id, tenant_id, content_type, content_id, reason, status, created_at")
      .single();

    if (insertError) {
      if (insertError.message.toLowerCase().includes("duplicate")) {
        throw new Error("Content already reported by this user");
      }

      throw new Error(`Failed to create content report: ${insertError.message}`);
    }

    await supabaseAdmin.from("content_report_audit_log").insert({
      report_id: report.id,
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "created",
      details: {
        reason: input.reason,
      },
    });

    let autoHidden = false;
    if (input.contentType === "post") {
      const { count } = await supabaseAdmin
        .from("content_reports")
        .select("id", { count: "exact", head: true })
        .eq("content_type", "post")
        .eq("content_id", input.contentId)
        .in("status", ["open", "investigating"]);

      if ((count ?? 0) >= 3) {
        autoHidden = true;
        await supabaseAdmin
          .from("school_feed_posts")
          .update({
            approval_status: "rejected",
            approval_notes: "Auto-hidden after report threshold",
          })
          .eq("id", input.contentId);

        if (ownerUserId) {
          await createNotification({
            tenantId,
            userId: ownerUserId,
            type: PORTAL_NOTIFICATION_TYPES.CONTENT_HIDDEN_BY_MODERATION,
            title: "Contenido ocultado temporalmente",
            message: "Tu contenido fue ocultado temporalmente por reportes y sera revisado por la escuela.",
            actionUrl: "/portal/feed",
            metadata: {
              contentType: input.contentType,
              contentId: input.contentId,
            },
          });
        }
      }
    }

    return {
      reportId: report.id as string,
      status: report.status as string,
      autoHidden,
      createdAt: report.created_at as string,
    };
  },

  async listOwnContentReports(userId: string, input: { status?: "open" | "investigating" | "resolved" | "dismissed"; limit: number; offset: number }) {
    let query = supabaseAdmin
      .from("content_reports")
      .select("id, tenant_id, content_type, content_id, reported_by_user_id, reason, description, status, action_taken, moderator_user_id, resolution_notes, resolved_at, created_at, updated_at", { count: "exact" })
      .eq("reported_by_user_id", userId)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.status) {
      query = query.eq("status", input.status);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to list own reports: ${error.message}`);
    }

    return {
      items: (data ?? []) as ContentReportRow[],
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async listTenantContentReports(
    tenantId: string,
    input: { status?: "open" | "investigating" | "resolved" | "dismissed"; limit: number; offset: number }
  ) {
    let query = supabaseAdmin
      .from("content_reports")
      .select("id, tenant_id, content_type, content_id, reported_by_user_id, reason, description, status, action_taken, moderator_user_id, resolution_notes, resolved_at, created_at, updated_at", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.status) {
      query = query.eq("status", input.status);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to list tenant reports: ${error.message}`);
    }

    return {
      items: (data ?? []) as ContentReportRow[],
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async updateContentReport(
    tenantId: string,
    moderatorUserId: string,
    reportId: string,
    input: {
      status: "open" | "investigating" | "resolved" | "dismissed";
      actionTaken: "none" | "warned" | "hidden" | "deleted";
      resolutionNotes?: string | null;
    }
  ) {
    const { data: report, error: reportError } = await supabaseAdmin
      .from("content_reports")
      .select("id, tenant_id, content_type, content_id, reported_by_user_id, status")
      .eq("id", reportId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (reportError || !report) {
      throw new Error("Report not found");
    }

    if (report.content_type === "post" && (input.actionTaken === "hidden" || input.actionTaken === "deleted")) {
      await supabaseAdmin
        .from("school_feed_posts")
        .update({
          approval_status: "rejected",
          approval_notes: input.actionTaken === "deleted" ? "Deleted by moderator" : "Hidden by moderator",
        })
        .eq("id", report.content_id);
    }

    const now = new Date().toISOString();
    const shouldMarkResolved = input.status === "resolved" || input.status === "dismissed";
    const { data, error } = await supabaseAdmin
      .from("content_reports")
      .update({
        status: input.status,
        action_taken: input.actionTaken,
        moderator_user_id: moderatorUserId,
        resolution_notes: normalizeNullable(input.resolutionNotes),
        resolved_at: shouldMarkResolved ? now : null,
      })
      .eq("id", reportId)
      .eq("tenant_id", tenantId)
      .select("id, tenant_id, content_type, content_id, reported_by_user_id, reason, description, status, action_taken, moderator_user_id, resolution_notes, resolved_at, created_at, updated_at")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update report: ${error?.message ?? "unknown error"}`);
    }

    await supabaseAdmin.from("content_report_audit_log").insert({
      report_id: reportId,
      tenant_id: tenantId,
      actor_user_id: moderatorUserId,
      action: "status_updated",
      details: {
        fromStatus: report.status,
        toStatus: input.status,
        actionTaken: input.actionTaken,
      },
    });

    await createNotification({
      tenantId,
      userId: report.reported_by_user_id as string,
      type: PORTAL_NOTIFICATION_TYPES.YOUR_REPORT_RESOLVED,
      title: "Tu reporte fue actualizado",
      message: `El estado actual es: ${input.status}.`,
      actionUrl: "/portal/feed",
      metadata: {
        reportId,
        status: input.status,
        actionTaken: input.actionTaken,
      },
    });

    return data as ContentReportRow;
  },

  async updateTeacherPostApproval(
    tenantId: string,
    postId: string,
    status: "published" | "rejected",
    approvalNotes?: string
  ) {
    const payload = {
      approval_status: status,
      approval_notes: normalizeNullable(approvalNotes),
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("school_feed_posts")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", postId)
      .eq("author_type", "teacher")
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update teacher post approval: ${error.message}`);
    }

    if (!data) {
      throw new Error("Teacher post not found");
    }

    if (data.author_user_id) {
      await createNotification({
        tenantId,
        userId: data.author_user_id,
        type:
          status === "published"
            ? PORTAL_NOTIFICATION_TYPES.TEACHER_POST_APPROVED
            : PORTAL_NOTIFICATION_TYPES.TEACHER_POST_REJECTED,
        title: status === "published" ? "Publicacion aprobada" : "Publicacion rechazada",
        message:
          status === "published"
            ? "Tu publicacion ya esta visible en el feed de la escuela."
            : approvalNotes?.trim() || "Tu publicacion fue rechazada. Revisa y vuelve a enviarla.",
        actionUrl: "/portal/app/feed",
        metadata: { postId, status },
      });
    }

    return data as SchoolFeedPostRow;
  },

  async followProfile(userId: string, targetProfileId: string) {
    const own = await this.getOrCreateOwnProfile(userId);

    if (own.id === targetProfileId) {
      throw new Error("Cannot follow your own profile");
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from("student_profiles")
      .select("id")
      .eq("id", targetProfileId)
      .maybeSingle();

    if (targetError || !target) {
      throw new Error("Target profile not found");
    }

    const { error } = await supabaseAdmin
      .from("student_followers")
      .insert({
        follower_profile_id: own.id,
        following_profile_id: targetProfileId,
      });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(`Failed to follow profile: ${error.message}`);
    }

    await syncFollowCounters(own.id, targetProfileId);

    const { data: targetOwner } = await supabaseAdmin
      .from("student_profiles")
      .select("user_id, tenant_id, display_name")
      .eq("id", targetProfileId)
      .maybeSingle();

    if (targetOwner?.user_id) {
      const targetPrivacy = await this.getPrivacySettings(targetOwner.user_id);
      if (!targetPrivacy.allowFollowerNotifications) {
        return { success: true };
      }

      await createNotification({
        tenantId: targetOwner.tenant_id,
        userId: targetOwner.user_id,
        type: PORTAL_NOTIFICATION_TYPES.NEW_FOLLOWER,
        title: "Nuevo seguidor",
        message: `${own.display_name} empezo a seguirte.`,
        actionUrl: `/portal/app/profile`,
        metadata: { followerProfileId: own.id },
      });
    }

    return { success: true };
  },

  async likeFeedPost(userId: string, postId: string) {
    const own = await this.getOrCreateOwnProfile(userId);

    const { data: post, error: postError } = await supabaseAdmin
      .from("school_feed_posts")
      .select("id, tenant_id, is_public, author_user_id, author_name")
      .eq("id", postId)
      .eq("is_public", true)
      .maybeSingle();

    if (postError || !post) {
      throw new Error("Public post not found");
    }

    const { error } = await supabaseAdmin
      .from("feed_interactions")
      .insert({
        tenant_id: post.tenant_id,
        post_id: postId,
        user_id: userId,
        profile_id: own.id,
        interaction_type: "like",
      });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(`Failed to like post: ${error.message}`);
    }

    await syncPostLikeCount(postId);

    if (post.author_user_id && post.author_user_id !== userId) {
      await createNotification({
        tenantId: post.tenant_id,
        userId: post.author_user_id,
        type: PORTAL_NOTIFICATION_TYPES.POST_LIKE,
        title: "Nuevo me gusta",
        message: `${own.display_name} marco me gusta en tu publicacion.`,
        actionUrl: `/portal/app/feed`,
        metadata: { postId },
      });
    }

    return { success: true };
  },

  async unlikeFeedPost(userId: string, postId: string) {
    const { error } = await supabaseAdmin
      .from("feed_interactions")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId)
      .eq("interaction_type", "like");

    if (error) {
      throw new Error(`Failed to remove like from post: ${error.message}`);
    }

    await syncPostLikeCount(postId);

    return { success: true };
  },

  async listLikedPostIds(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("feed_interactions")
      .select("post_id")
      .eq("user_id", userId)
      .eq("interaction_type", "like")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list liked posts: ${error.message}`);
    }

    return ((data ?? []) as FeedLikeRow[]).map((row) => row.post_id);
  },

  async unfollowProfile(userId: string, targetProfileId: string) {
    const own = await this.getOrCreateOwnProfile(userId);

    const { error } = await supabaseAdmin
      .from("student_followers")
      .delete()
      .eq("follower_profile_id", own.id)
      .eq("following_profile_id", targetProfileId);

    if (error) {
      throw new Error(`Failed to unfollow profile: ${error.message}`);
    }

    await syncFollowCounters(own.id, targetProfileId);

    return { success: true };
  },

  async listFollowers(profileId: string) {
    const { data, error } = await supabaseAdmin
      .from("student_followers")
      .select("created_at, follower:student_profiles!student_followers_follower_profile_id_fkey(id, display_name, stage_name, avatar_url, public_profile, city, styles)")
      .eq("following_profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list followers: ${error.message}`);
    }

    return ((data ?? []) as FollowersQueryRow[]).map((row) => ({
      createdAt: row.created_at,
      profile: Array.isArray(row.follower) ? row.follower[0] : row.follower,
    }));
  },

  async listFollowing(profileId: string) {
    const { data, error } = await supabaseAdmin
      .from("student_followers")
      .select("created_at, following:student_profiles!student_followers_following_profile_id_fkey(id, display_name, stage_name, avatar_url, public_profile, city, styles)")
      .eq("follower_profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list following profiles: ${error.message}`);
    }

    return ((data ?? []) as FollowingQueryRow[]).map((row) => ({
      createdAt: row.created_at,
      profile: Array.isArray(row.following) ? row.following[0] : row.following,
    }));
  },

  async listNotifications(userId: string, input: { limit: number; onlyUnread: boolean }) {
    let query = supabaseAdmin
      .from("user_notifications")
      .select("id, tenant_id, type, title, message, action_url, metadata, is_read, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(input.limit);

    if (input.onlyUnread) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list notifications: ${error.message}`);
    }

    return data ?? [];
  },

  async markNotificationRead(userId: string, notificationId: string) {
    const { data, error } = await supabaseAdmin
      .from("user_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select("id, is_read, read_at")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }

    return data;
  },

  async saveItem(userId: string, input: SaveItemParamsInput) {
    let tenantId: string | null = null;

    if (input.itemType === "post") {
      const { data: post, error } = await supabaseAdmin
        .from("school_feed_posts")
        .select("id, tenant_id, is_public")
        .eq("id", input.itemId)
        .eq("is_public", true)
        .maybeSingle();

      if (error || !post) {
        throw new Error("Public post not found");
      }

      tenantId = post.tenant_id as string;
    } else {
      const { data: event, error } = await supabaseAdmin
        .from("events")
        .select("id, tenant_id, status")
        .eq("id", input.itemId)
        .eq("status", "published")
        .maybeSingle();

      if (error || !event) {
        throw new Error("Public event not found");
      }

      tenantId = event.tenant_id as string;
    }

    const { error: insertError } = await supabaseAdmin
      .from("student_saved_items")
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        item_type: input.itemType,
        item_id: input.itemId,
      });

    if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
      throw new Error(`Failed to save item: ${insertError.message}`);
    }

    if (input.itemType === "post") {
      await syncPostSaveCount(input.itemId);
    }

    return { success: true };
  },

  async unsaveItem(userId: string, input: SaveItemParamsInput) {
    const { error } = await supabaseAdmin
      .from("student_saved_items")
      .delete()
      .eq("user_id", userId)
      .eq("item_type", input.itemType)
      .eq("item_id", input.itemId);

    if (error) {
      throw new Error(`Failed to unsave item: ${error.message}`);
    }

    if (input.itemType === "post") {
      await syncPostSaveCount(input.itemId);
    }

    return { success: true };
  },

  async listSavedItems(
    userId: string,
    input: { itemType?: "post" | "event"; limit: number; offset: number }
  ) {
    let query = supabaseAdmin
      .from("student_saved_items")
      .select("id, user_id, tenant_id, item_type, item_id, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.itemType) {
      query = query.eq("item_type", input.itemType);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list saved items: ${error.message}`);
    }

    const items = ((data ?? []) as SavedItemRow[]).map((row) => ({
      id: row.id,
      itemType: row.item_type,
      itemId: row.item_id,
      tenantId: row.tenant_id,
      createdAt: row.created_at,
    }));

    return {
      items,
      total: count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  },

  async getProfileById(profileId: string) {
    const { data, error } = await supabaseAdmin
      .from("student_profiles")
      .select("id, display_name, stage_name, avatar_url, city, styles, level, years_experience, public_profile, xp, level_number, streak_count, followers_count, following_count")
      .eq("id", profileId)
      .eq("public_profile", true)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      ...data,
      styles: asArrayOfStrings((data as { styles?: unknown }).styles),
    };
  },

  async getTeacherPublicProfile(teacherId: string): Promise<TeacherPublicProfile | null> {
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers")
      .select("id, tenant_id, name, email, phone, bio, status")
      .eq("id", teacherId)
      .eq("status", "active")
      .maybeSingle();

    if (teacherError) {
      throw new Error(`Failed to fetch teacher profile: ${teacherError.message}`);
    }

    if (!teacher) {
      return null;
    }

    const { data: school } = await supabaseAdmin
      .from("school_public_profiles")
      .select("name")
      .eq("tenant_id", teacher.tenant_id)
      .eq("is_public", true)
      .maybeSingle();

    const { count } = await supabaseAdmin
      .from("class_teachers")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacher.id);

    return {
      id: teacher.id,
      tenantId: teacher.tenant_id,
      schoolName: school?.name ?? "Escuela",
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      bio: teacher.bio,
      status: teacher.status,
      classesCount: count ?? 0,
    };
  },
};
