import { apiRequest } from "@/lib/api/client";
import { readPortalCache, writePortalCache } from "@/lib/portalCache";

export type PortalFeedType = "class" | "event" | "achievement" | "announcement" | "choreography";
export type PortalFeedVisibilityScope = "public" | "followers" | "school";

export interface PortalProfile {
  id: string;
  displayName: string;
  stageName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  city: string | null;
  styles: string[];
  level: string | null;
  yearsExperience: number | null;
  publicProfile: boolean;
  xp: number;
  levelNumber: number;
  streakCount: number;
  followersCount: number;
  followingCount: number;
}

export interface PortalSchool {
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  location: string | null;
  activityLevel: string;
  totalStudents: number;
}

export interface PortalSchoolMetrics {
  tenantId: string;
  slug: string;
  name: string;
  activeStudents: number;
  postsRecent: number;
  eventsRecent: number;
  engagementRate: number;
  postsPerWeek: number;
  studentGrowthRate: number;
  eventsGrowthRate: number;
  followersCount: number;
  viewsCount: number;
  conversionRate: number;
  lastActivityAt: string | null;
  trendingBadge: boolean;
}

export interface PortalComparedSchool {
  school: PortalSchool;
  metrics: Omit<PortalSchoolMetrics, "slug" | "name" | "tenantId">;
}

export interface PortalEcosystemStats {
  totalSchools: number;
  activeSchools: number;
  activeSchoolsRate: number;
  totalDancers: number;
  totalPosts: number;
  totalPublishedEvents: number;
  totalFollowConnections: number;
  updatedAt: string;
}

export interface PortalFeedPost {
  id: string;
  tenantId: string;
  authorType: "school" | "teacher";
  authorName: string;
  authorAvatarUrl: string | null;
  type: PortalFeedType;
  content: string;
  imageUrls: string[];
  videoUrl: string | null;
  mediaIds: string[];
  mediaItems: PortalMediaAsset[];
  visibilityScope: PortalFeedVisibilityScope;
  likesCount: number;
  savesCount: number;
  approvalStatus?: "draft" | "pending_approval" | "published" | "rejected";
  approvalNotes?: string | null;
  publishedAt: string;
}

export interface PortalMediaAsset {
  id: string;
  tenantId: string;
  kind: "image" | "video";
  provider: string;
  bucket: string | null;
  path: string | null;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  processingStatus: "pending" | "processing" | "ready" | "failed";
  processingMetadata: Record<string, unknown>;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortalPublicEvent {
  id: string;
  tenantId: string;
  schoolName: string;
  name: string;
  startDate: string;
  endDate: string | null;
  location: string;
  description: string | null;
  status: "draft" | "published";
}

export interface PortalEventParticipant {
  profileId: string;
  studentId: string;
  displayName: string;
  stageName: string | null;
  avatarUrl: string | null;
  city: string | null;
  confirmedAt: string | null;
}

export interface PortalEventMediaItem {
  id: string;
  eventId: string;
  mediaId: string;
  sortOrder: number;
  createdAt: string;
  media: PortalMediaAsset;
}

export interface PortalSchoolInvitation {
  id: string;
  tenantId: string;
  invitedEmail: string;
  code: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  message: string | null;
  invitedByUserId: string | null;
  acceptedByUserId: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

export type PortalContentReportReason = "inappropriate" | "spam" | "harassment" | "minor_safety" | "other";
export type PortalContentReportStatus = "open" | "investigating" | "resolved" | "dismissed";

export interface PortalContentReport {
  id: string;
  tenantId: string;
  contentType: "post" | "profile";
  contentId: string;
  reportedByUserId: string;
  reason: PortalContentReportReason;
  description: string | null;
  status: PortalContentReportStatus;
  actionTaken: "none" | "warned" | "hidden" | "deleted" | null;
  moderatorUserId: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalSavedItem {
  id: string;
  itemType: "post" | "event";
  itemId: string;
  tenantId: string | null;
  createdAt: string;
}

export interface PortalNotificationItem {
  id: string;
  tenantId: string | null;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface PortalNotificationContractType {
  type: string;
  title: string;
  description: string;
  metadataFields: string[];
}

export interface PortalNotificationContractResponse {
  contract: "portal.notification";
  contractVersion: string;
  generatedAt: string;
  types: PortalNotificationContractType[];
}

export interface PortalPublicProfileSummary {
  id: string;
  displayName: string;
  stageName: string | null;
  avatarUrl: string | null;
  publicProfile: boolean;
  city: string | null;
  styles: string[];
}

export interface PortalFollowerItem {
  createdAt: string;
  profile: PortalPublicProfileSummary | null;
}

export interface PortalTeacherPublicProfile {
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

export interface PortalSchoolAnalytics {
  studentsCount: number;
  activeClassesCount: number;
  postsCount: number;
  eventsCount: number;
  followersCount: number;
  viewsCount: number;
  conversionRate: number;
  lastActivityAt: string | null;
}

export interface PortalSchoolAnnouncement extends PortalFeedPost {
  announcementTitle?: string;
  isImportant?: boolean;
  isUrgent?: boolean;
}

export interface PortalGalleryAlbum {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  eventId: string | null;
  isPublic: boolean;
  createdAt: string;
}

export interface PortalGalleryPhoto {
  id: string;
  tenantId: string;
  albumId: string;
  imageUrl: string;
  caption: string | null;
  eventId: string | null;
  isPublic: boolean;
  createdAt: string;
}

export interface PortalTeacherClass {
  id: string;
  tenantId: string;
  name: string;
  roomId: string | null;
  disciplineId: string | null;
  categoryId: string | null;
  status: string;
  capacity: number;
  teachers: Array<{ id: string; name: string }>;
}

export interface PortalTeacherScheduleSlot {
  id: string;
  class_id: string;
  class_name: string;
  weekday: number;
  start_time: string;
  end_time: string;
  room_id: string | null;
}

export interface PortalTeacherRosterStudent {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface PortalPrivacySettings {
  showProfileInSearch: boolean;
  showCity: boolean;
  showStats: boolean;
  showAchievements: boolean;
  showCertifications: boolean;
  allowFollowerNotifications: boolean;
  allowUsageAnalytics: boolean;
}

export interface PortalContextResponse {
  userId: string;
  tenantMemberships: Array<{
    tenantId: string;
    role: "owner" | "admin" | "staff";
    organizationRole: "owner" | "admin" | "manager" | "member" | null;
  }>;
  roleProjection: {
    isStudent: boolean;
    isTeacher: boolean;
    isSchoolAdmin: boolean;
    studentTenantIds: string[];
    teacherTenantIds: string[];
    adminTenantIds: string[];
  };
}

export interface PortalFollowedSchool {
  tenantId: string;
  createdAt: string;
  school: {
    tenantId: string;
    name: string;
    slug: string;
    location: string | null;
    logoUrl: string | null;
    isPublic: boolean;
  };
}

export interface PortalGlobalSearchResults {
  query: string;
  schools: PortalSchool[];
  events: PortalPublicEvent[];
  profiles: Array<{
    id: string;
    displayName: string;
    stageName: string | null;
    avatarUrl: string | null;
    city: string | null;
    styles: string[];
    publicProfile: boolean;
  }>;
}

export interface PortalAnalyticsOverview {
  windowDays: number;
  trackedEvents: number;
  engagement: {
    views: number;
    likes: number;
    saves: number;
    searches: number;
    engagementRate: number;
  };
  funnel: {
    explorerViews: number;
    onboardingCompletions: number;
    enrollmentStarts: number;
    enrollmentCompletions: number;
    conversionRate: number;
  };
  adoption: {
    postsPublished: number;
    eventsPublished: number;
    featureUse: {
      globalSearches: number;
      savedInteractions: number;
      likeInteractions: number;
    };
  };
  retention: {
    activeStudents: number;
    activeNewMembers: number;
    churnRiskRate: number;
  };
  generatedAt: string;
}

export interface PortalPlanFeatureMatrixItem {
  featureKey: string;
  area: "portal-alumno" | "portal-social" | "portal-eventos" | "portal-escuela";
  title: string;
  description: string;
  availabilityByPlan: {
    starter: "included" | "limited" | "not_included";
    pro: "included" | "limited" | "not_included";
    enterprise: "included" | "limited" | "not_included";
  };
  technicalSource: string;
}

export interface PortalPlanFeatureMatrixResponse {
  contract: "portal.plan-feature-matrix";
  version: string;
  generatedAt: string;
  plans: Record<string, unknown>;
  matrix: PortalPlanFeatureMatrixItem[];
}

export interface PortalKpiDefinition {
  key: string;
  name: string;
  category: "engagement" | "funnel" | "adoption" | "retention";
  formula: string;
  source: string[];
  frequency: "daily" | "weekly" | "monthly";
  owner: "product" | "growth" | "school-ops";
  target: string;
}

export interface PortalKpiContractResponse {
  contract: "portal.kpi-definitions";
  version: string;
  generatedAt: string;
  kpis: PortalKpiDefinition[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PortalProfileInput {
  displayName: string;
  stageName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  styles?: string[];
  level?: string | null;
  yearsExperience?: number | null;
  publicProfile?: boolean;
}

export interface PortalSchoolProfileInput {
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  location?: string | null;
  isPublic?: boolean;
}

type SchoolTrendingOrder = "activity" | "students" | "engagement" | "followers" | "views";

const PROFILE_CACHE_KEY = "profile:own";
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const EVENTS_CACHE_PREFIX = "public-events";
const EVENTS_CACHE_TTL_MS = 2 * 60 * 1000;

function toPortalProfile(raw: Record<string, unknown>): PortalProfile {
  return {
    id: String(raw.id ?? ""),
    displayName: String(raw.display_name ?? ""),
    stageName: (raw.stage_name as string | null | undefined) ?? null,
    bio: (raw.bio as string | null | undefined) ?? null,
    avatarUrl: (raw.avatar_url as string | null | undefined) ?? null,
    city: (raw.city as string | null | undefined) ?? null,
    styles: Array.isArray(raw.styles) ? raw.styles.filter((item): item is string => typeof item === "string") : [],
    level: (raw.level as string | null | undefined) ?? null,
    yearsExperience: typeof raw.years_experience === "number" ? raw.years_experience : null,
    publicProfile: Boolean(raw.public_profile),
    xp: typeof raw.xp === "number" ? raw.xp : 0,
    levelNumber: typeof raw.level_number === "number" ? raw.level_number : 1,
    streakCount: typeof raw.streak_count === "number" ? raw.streak_count : 0,
    followersCount: typeof raw.followers_count === "number" ? raw.followers_count : 0,
    followingCount: typeof raw.following_count === "number" ? raw.following_count : 0,
  };
}

function toPortalFeedPost(raw: Record<string, unknown>): PortalFeedPost {
  const mediaItems = Array.isArray(raw.media_items)
    ? raw.media_items
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map(toPortalMediaAsset)
    : [];

  const legacyImageUrls = Array.isArray(raw.image_urls)
    ? raw.image_urls.filter((item): item is string => typeof item === "string")
    : [];
  const mediaImageUrls = mediaItems.filter((item) => item.kind === "image").map((item) => item.url);
  const imageUrls = Array.from(new Set([...legacyImageUrls, ...mediaImageUrls]));
  const legacyVideoUrl = (raw.video_url as string | null | undefined) ?? null;
  const mediaVideoUrl = mediaItems.find((item) => item.kind === "video")?.url ?? null;

  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? ""),
    authorType: raw.author_type === "teacher" ? "teacher" : "school",
    authorName: String(raw.author_name ?? ""),
    authorAvatarUrl: (raw.author_avatar_url as string | null | undefined) ?? null,
    type: (raw.type as PortalFeedType) ?? "announcement",
    content: String(raw.content ?? ""),
    imageUrls,
    videoUrl: legacyVideoUrl ?? mediaVideoUrl,
    mediaIds: Array.isArray(raw.media_ids) ? raw.media_ids.filter((item): item is string => typeof item === "string") : [],
    mediaItems,
    visibilityScope:
      raw.visibility_scope === "followers" || raw.visibility_scope === "school"
        ? raw.visibility_scope
        : raw.is_public === false
          ? "school"
          : "public",
    likesCount: typeof raw.likes_count === "number" ? raw.likes_count : 0,
    savesCount: typeof raw.saves_count === "number" ? raw.saves_count : 0,
    approvalStatus:
      raw.approval_status === "draft" ||
      raw.approval_status === "pending_approval" ||
      raw.approval_status === "published" ||
      raw.approval_status === "rejected"
        ? raw.approval_status
        : undefined,
    approvalNotes: (raw.approval_notes as string | null | undefined) ?? null,
    publishedAt: String(raw.published_at ?? new Date().toISOString()),
  };
}

function toPortalMediaAsset(raw: Record<string, unknown>): PortalMediaAsset {
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? ""),
    kind: raw.kind === "video" ? "video" : "image",
    provider: String(raw.provider ?? "external"),
    bucket: (raw.bucket as string | null | undefined) ?? null,
    path: (raw.path as string | null | undefined) ?? null,
    url: String(raw.url ?? ""),
    thumbnailUrl: (raw.thumbnail_url as string | null | undefined) ?? null,
    mimeType: (raw.mime_type as string | null | undefined) ?? null,
    sizeBytes: typeof raw.size_bytes === "number" ? raw.size_bytes : null,
    width: typeof raw.width === "number" ? raw.width : null,
    height: typeof raw.height === "number" ? raw.height : null,
    durationSeconds: typeof raw.duration_seconds === "number" ? raw.duration_seconds : null,
    processingStatus:
      raw.processing_status === "pending" ||
      raw.processing_status === "processing" ||
      raw.processing_status === "failed"
        ? raw.processing_status
        : "ready",
    processingMetadata:
      raw.processing_metadata && typeof raw.processing_metadata === "object"
        ? (raw.processing_metadata as Record<string, unknown>)
        : {},
    isPublic: Boolean(raw.is_public),
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? new Date().toISOString()),
  };
}

function toPortalSchool(raw: Record<string, unknown>): PortalSchool {
  return {
    tenantId: String(raw.tenant_id ?? ""),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    description: (raw.description as string | null | undefined) ?? null,
    logoUrl: (raw.logo_url as string | null | undefined) ?? null,
    location: (raw.location as string | null | undefined) ?? null,
    activityLevel: String(raw.activity_level ?? "new"),
    totalStudents: typeof raw.total_students === "number" ? raw.total_students : 0,
  };
}

function toPortalPublicEvent(raw: Record<string, unknown>): PortalPublicEvent {
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? ""),
    schoolName: String(raw.school_name ?? "Escuela"),
    name: String(raw.name ?? ""),
    startDate: String(raw.start_date ?? ""),
    endDate: (raw.end_date as string | null | undefined) ?? null,
    location: String(raw.location ?? ""),
    description: (raw.description as string | null | undefined) ?? null,
    status: raw.status === "draft" ? "draft" : "published",
  };
}

function toPortalGalleryAlbum(raw: Record<string, unknown>): PortalGalleryAlbum {
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? ""),
    name: String(raw.name ?? ""),
    description: (raw.description as string | null | undefined) ?? null,
    eventId: (raw.event_id as string | null | undefined) ?? null,
    isPublic: Boolean(raw.is_public),
    createdAt: String(raw.created_at ?? new Date().toISOString()),
  };
}

function toPortalGalleryPhoto(raw: Record<string, unknown>): PortalGalleryPhoto {
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? ""),
    albumId: String(raw.album_id ?? ""),
    imageUrl: String(raw.image_url ?? ""),
    caption: (raw.caption as string | null | undefined) ?? null,
    eventId: (raw.event_id as string | null | undefined) ?? null,
    isPublic: Boolean(raw.is_public),
    createdAt: String(raw.created_at ?? new Date().toISOString()),
  };
}

function toPublicProfileSummary(raw: Record<string, unknown>): PortalPublicProfileSummary {
  return {
    id: String(raw.id ?? ""),
    displayName: String(raw.display_name ?? ""),
    stageName: (raw.stage_name as string | null | undefined) ?? null,
    avatarUrl: (raw.avatar_url as string | null | undefined) ?? null,
    publicProfile: Boolean(raw.public_profile),
    city: (raw.city as string | null | undefined) ?? null,
    styles: Array.isArray(raw.styles) ? raw.styles.filter((item): item is string => typeof item === "string") : [],
  };
}

function toPaginated<T>(
  raw: Record<string, unknown>,
  mapItem: (item: Record<string, unknown>) => T
): PaginatedResult<T> {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  return {
    items: itemsRaw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map(mapItem),
    total: typeof raw.total === "number" ? raw.total : 0,
    limit: typeof raw.limit === "number" ? raw.limit : itemsRaw.length,
    offset: typeof raw.offset === "number" ? raw.offset : 0,
  };
}

export async function getOwnPortalProfile() {
  const cached = readPortalCache<PortalProfile>(PROFILE_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const response = await apiRequest<Record<string, unknown>>("/api/public/portal/profile");
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar el perfil del portal");
  }

  const mapped = toPortalProfile(response.data);
  writePortalCache(PROFILE_CACHE_KEY, mapped, PROFILE_CACHE_TTL_MS);
  return mapped;
}

export async function updateOwnPortalProfile(payload: PortalProfileInput) {
  const response = await apiRequest<Record<string, unknown>>("/api/public/portal/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar el perfil del portal");
  }

  const mapped = toPortalProfile(response.data);
  writePortalCache(PROFILE_CACHE_KEY, mapped, PROFILE_CACHE_TTL_MS);
  return mapped;
}

export async function listPublicPortalSchools(params?: { q?: string; limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/schools${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar las escuelas públicas");
  }

  return toPaginated(response.data, toPortalSchool);
}

export async function getPublicPortalSchoolBySlug(slug: string): Promise<PortalSchool | null> {
  const response = await apiRequest<Record<string, unknown>>(`/api/public/portal/schools/${slug}`);

  if (!response.success) {
    if (response.error?.code === "not_found") {
      return null;
    }
    throw new Error(response.error?.message || "No se pudo cargar la escuela");
  }

  if (!response.data) {
    return null;
  }

  return toPortalSchool(response.data);
}

export async function getPublicPortalSchoolMetrics(slug: string): Promise<PortalSchoolMetrics | null> {
  const response = await apiRequest<Record<string, unknown>>(`/api/public/portal/schools/${slug}/metrics`);

  if (!response.success) {
    if (response.error?.code === "not_found") {
      return null;
    }
    throw new Error(response.error?.message || "No se pudieron cargar metricas de escuela");
  }

  if (!response.data) {
    return null;
  }

  return {
    tenantId: String(response.data.tenantId ?? ""),
    slug: String(response.data.slug ?? slug),
    name: String(response.data.name ?? "Escuela"),
    activeStudents: typeof response.data.activeStudents === "number" ? response.data.activeStudents : 0,
    postsRecent: typeof response.data.postsRecent === "number" ? response.data.postsRecent : 0,
    eventsRecent: typeof response.data.eventsRecent === "number" ? response.data.eventsRecent : 0,
    engagementRate: typeof response.data.engagementRate === "number" ? response.data.engagementRate : 0,
    postsPerWeek: typeof response.data.postsPerWeek === "number" ? response.data.postsPerWeek : 0,
    studentGrowthRate: typeof response.data.studentGrowthRate === "number" ? response.data.studentGrowthRate : 0,
    eventsGrowthRate: typeof response.data.eventsGrowthRate === "number" ? response.data.eventsGrowthRate : 0,
    followersCount: typeof response.data.followersCount === "number" ? response.data.followersCount : 0,
    viewsCount: typeof response.data.viewsCount === "number" ? response.data.viewsCount : 0,
    conversionRate: typeof response.data.conversionRate === "number" ? response.data.conversionRate : 0,
    lastActivityAt: (response.data.lastActivityAt as string | null | undefined) ?? null,
    trendingBadge: Boolean(response.data.trendingBadge),
  };
}

export async function listTrendingPortalSchools(params?: {
  limit?: number;
  offset?: number;
  orderBy?: SchoolTrendingOrder;
}) {
  const search = new URLSearchParams();
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));
  if (params?.orderBy) search.set("orderBy", params.orderBy);

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/schools/trending${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar escuelas trending");
  }

  return toPaginated(response.data, (item) => ({
    ...toPortalSchool(item),
    rankingScore: typeof item.engagementScore === "number" ? item.engagementScore : 0,
    metrics: item.metrics && typeof item.metrics === "object" ? (item.metrics as Record<string, unknown>) : null,
  }));
}

export async function listRecommendedPortalSchools(params?: {
  city?: string;
  styles?: string[];
  level?: string;
  minStudents?: number;
  maxStudents?: number;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.city) search.set("city", params.city);
  if (params?.styles && params.styles.length > 0) search.set("styles", params.styles.join(","));
  if (params?.level) search.set("level", params.level);
  if (typeof params?.minStudents === "number") search.set("minStudents", String(params.minStudents));
  if (typeof params?.maxStudents === "number") search.set("maxStudents", String(params.maxStudents));
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/schools/recommended${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar escuelas recomendadas");
  }

  return toPaginated(response.data, (item) => ({
    ...toPortalSchool(item),
    recommendationScore: typeof item.recommendation_score === "number" ? item.recommendation_score : 0,
  }));
}

export async function searchPublicPortalSchools(params?: {
  q?: string;
  city?: string;
  level?: string;
  minStudents?: number;
  maxStudents?: number;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.city) search.set("city", params.city);
  if (params?.level) search.set("level", params.level);
  if (typeof params?.minStudents === "number") search.set("minStudents", String(params.minStudents));
  if (typeof params?.maxStudents === "number") search.set("maxStudents", String(params.maxStudents));
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/schools/search${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron buscar escuelas");
  }

  return toPaginated(response.data, toPortalSchool);
}

export async function comparePortalSchools(slugs: string[]): Promise<PortalComparedSchool[]> {
  const query = new URLSearchParams({ slugs: slugs.join(",") }).toString();
  const response = await apiRequest<Array<Record<string, unknown>>>(`/api/public/portal/schools/compare?${query}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron comparar escuelas");
  }

  return response.data.map((row) => {
    const schoolRaw = row.school as Record<string, unknown>;
    const metricsRaw = row.metrics as Record<string, unknown>;
    return {
      school: toPortalSchool(schoolRaw),
      metrics: {
        activeStudents: typeof metricsRaw.activeStudents === "number" ? metricsRaw.activeStudents : 0,
        postsRecent: typeof metricsRaw.postsRecent === "number" ? metricsRaw.postsRecent : 0,
        eventsRecent: typeof metricsRaw.eventsRecent === "number" ? metricsRaw.eventsRecent : 0,
        engagementRate: typeof metricsRaw.engagementRate === "number" ? metricsRaw.engagementRate : 0,
        postsPerWeek: typeof metricsRaw.postsPerWeek === "number" ? metricsRaw.postsPerWeek : 0,
        studentGrowthRate: typeof metricsRaw.studentGrowthRate === "number" ? metricsRaw.studentGrowthRate : 0,
        eventsGrowthRate: typeof metricsRaw.eventsGrowthRate === "number" ? metricsRaw.eventsGrowthRate : 0,
        followersCount: typeof metricsRaw.followersCount === "number" ? metricsRaw.followersCount : 0,
        viewsCount: typeof metricsRaw.viewsCount === "number" ? metricsRaw.viewsCount : 0,
        conversionRate: typeof metricsRaw.conversionRate === "number" ? metricsRaw.conversionRate : 0,
        lastActivityAt: (metricsRaw.lastActivityAt as string | null | undefined) ?? null,
        trendingBadge: false,
      },
    };
  });
}

export async function getPortalEcosystemStats(): Promise<PortalEcosystemStats> {
  const response = await apiRequest<Record<string, unknown>>("/api/public/portal/ecosystem-stats");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar estadisticas del ecosistema");
  }

  return {
    totalSchools: typeof response.data.totalSchools === "number" ? response.data.totalSchools : 0,
    activeSchools: typeof response.data.activeSchools === "number" ? response.data.activeSchools : 0,
    activeSchoolsRate: typeof response.data.activeSchoolsRate === "number" ? response.data.activeSchoolsRate : 0,
    totalDancers: typeof response.data.totalDancers === "number" ? response.data.totalDancers : 0,
    totalPosts: typeof response.data.totalPosts === "number" ? response.data.totalPosts : 0,
    totalPublishedEvents: typeof response.data.totalPublishedEvents === "number" ? response.data.totalPublishedEvents : 0,
    totalFollowConnections: typeof response.data.totalFollowConnections === "number" ? response.data.totalFollowConnections : 0,
    updatedAt: String(response.data.updatedAt ?? new Date().toISOString()),
  };
}

export async function searchPortalGlobal(q: string, limitPerType = 6): Promise<PortalGlobalSearchResults> {
  const search = new URLSearchParams({ q, limitPerType: String(limitPerType) }).toString();
  const response = await apiRequest<Record<string, unknown>>(`/api/public/portal/search?${search}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo ejecutar la busqueda global");
  }

  const schoolsRaw = Array.isArray(response.data.schools) ? response.data.schools : [];
  const eventsRaw = Array.isArray(response.data.events) ? response.data.events : [];
  const profilesRaw = Array.isArray(response.data.profiles) ? response.data.profiles : [];

  return {
    query: String(response.data.query ?? q),
    schools: schoolsRaw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map(toPortalSchool),
    events: eventsRaw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map(toPortalPublicEvent),
    profiles: profilesRaw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        id: String(item.id ?? ""),
        displayName: String(item.displayName ?? ""),
        stageName: (item.stageName as string | null | undefined) ?? null,
        avatarUrl: (item.avatarUrl as string | null | undefined) ?? null,
        city: (item.city as string | null | undefined) ?? null,
        styles: Array.isArray(item.styles) ? item.styles.filter((style): style is string => typeof style === "string") : [],
        publicProfile: Boolean(item.publicProfile),
      })),
  };
}

export async function getPortalPrivacySettings(): Promise<PortalPrivacySettings> {
  const response = await apiRequest<PortalPrivacySettings>("/api/public/portal/privacy");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar tus preferencias de privacidad");
  }

  return response.data;
}

export async function updatePortalPrivacySettings(payload: Partial<PortalPrivacySettings>): Promise<PortalPrivacySettings> {
  const response = await apiRequest<PortalPrivacySettings>("/api/public/portal/privacy", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron actualizar tus preferencias de privacidad");
  }

  return response.data;
}

export async function exportPortalOwnData() {
  const response = await apiRequest<Record<string, unknown>>("/api/public/portal/export-data");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron exportar tus datos");
  }

  return response.data;
}

export async function getSchoolPortalAnalyticsOverview(days = 30): Promise<PortalAnalyticsOverview> {
  const response = await apiRequest<PortalAnalyticsOverview>(`/api/school/portal/analytics?days=${days}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar la analitica avanzada del portal");
  }

  return response.data;
}

export async function listPublicPortalFeed(params?: {
  tenantId?: string;
  type?: PortalFeedType;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.tenantId) search.set("tenantId", params.tenantId);
  if (params?.type) search.set("type", params.type);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/feed${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar el feed público");
  }

  return toPaginated(response.data, toPortalFeedPost);
}

export async function listPersonalizedPortalFeed(params?: {
  type?: PortalFeedType;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<PortalFeedPost> & { personalized: boolean; targetTenantIds: string[] }> {
  const search = new URLSearchParams();
  if (params?.type) search.set("type", params.type);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/feed/personalized${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar el feed personalizado");
  }

  return {
    ...toPaginated(response.data, toPortalFeedPost),
    personalized: Boolean(response.data.personalized),
    targetTenantIds: Array.isArray(response.data.targetTenantIds)
      ? response.data.targetTenantIds.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export async function listLikedPortalPostIds() {
  const response = await apiRequest<{ likedPostIds: string[] }>("/api/public/portal/feed/liked");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar likes del usuario");
  }

  return response.data.likedPostIds || [];
}

export async function likePortalPost(postId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/public/portal/feed/${postId}/like`, {
    method: "POST",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo marcar me gusta");
  }

  return true;
}

export async function unlikePortalPost(postId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/public/portal/feed/${postId}/like`, {
    method: "DELETE",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo quitar me gusta");
  }

  return true;
}

export async function listPublicPortalEvents(params?: {
  tenantId?: string;
  limit?: number;
  offset?: number;
  upcomingOnly?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.tenantId) search.set("tenantId", params.tenantId);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));
  if (typeof params?.upcomingOnly === "boolean") search.set("upcomingOnly", String(params.upcomingOnly));
  const query = search.toString();
  const cacheKey = `${EVENTS_CACHE_PREFIX}:${query || "default"}`;

  const cached = readPortalCache<PaginatedResult<PortalPublicEvent>>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/events${query ? `?${query}` : ""}`
  );

  if (!response.success || !response.data) {
    if (cached) {
      return cached;
    }
    throw new Error(response.error?.message || "No se pudieron cargar los eventos públicos");
  }

  const mapped = toPaginated(response.data, toPortalPublicEvent);
  writePortalCache(cacheKey, mapped, EVENTS_CACHE_TTL_MS);
  return mapped;
}

export async function listPortalEventParticipants(
  eventId: string,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedResult<PortalEventParticipant>> {
  const search = new URLSearchParams();
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/events/${eventId}/participants${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar los participantes del evento");
  }

  return toPaginated(response.data, (raw) => ({
    profileId: String(raw.profileId ?? ""),
    studentId: String(raw.studentId ?? ""),
    displayName: String(raw.displayName ?? "Bailarin"),
    stageName: (raw.stageName as string | null | undefined) ?? null,
    avatarUrl: (raw.avatarUrl as string | null | undefined) ?? null,
    city: (raw.city as string | null | undefined) ?? null,
    confirmedAt: (raw.confirmedAt as string | null | undefined) ?? null,
  }));
}

export async function listPortalEventMedia(
  eventId: string,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedResult<PortalEventMediaItem>> {
  const search = new URLSearchParams();
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/events/${eventId}/media${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar la galeria del evento");
  }

  return toPaginated(response.data, (raw) => ({
    id: String(raw.id ?? ""),
    eventId: String(raw.eventId ?? eventId),
    mediaId: String(raw.mediaId ?? ""),
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    media:
      raw.media && typeof raw.media === "object"
        ? toPortalMediaAsset(raw.media as Record<string, unknown>)
        : toPortalMediaAsset({}),
  }));
}

export async function attachPortalEventMedia(eventId: string, mediaIds: string[]) {
  const response = await apiRequest<{ success: boolean; attached: number }>(`/api/admin/portal/events/${eventId}/media`, {
    method: "POST",
    body: JSON.stringify({ mediaIds }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo vincular media al evento");
  }

  return response.data;
}

export async function invitePortalStudents(payload: {
  emails: string[];
  message?: string | null;
  expiresInDays?: number;
}) {
  const response = await apiRequest<Record<string, unknown>>("/api/admin/portal/student-invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron crear invitaciones");
  }

  return response.data;
}

export async function listPortalSchoolInvitations(params?: {
  status?: "pending" | "accepted" | "revoked" | "expired";
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<PortalSchoolInvitation>> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/admin/portal/student-invitations${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar invitaciones");
  }

  return toPaginated(response.data, (raw) => ({
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenantId ?? ""),
    invitedEmail: String(raw.invitedEmail ?? ""),
    code: String(raw.code ?? ""),
    status: (raw.status as PortalSchoolInvitation["status"]) ?? "pending",
    message: (raw.message as string | null | undefined) ?? null,
    invitedByUserId: (raw.invitedByUserId as string | null | undefined) ?? null,
    acceptedByUserId: (raw.acceptedByUserId as string | null | undefined) ?? null,
    expiresAt: (raw.expiresAt as string | null | undefined) ?? null,
    acceptedAt: (raw.acceptedAt as string | null | undefined) ?? null,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  }));
}

export async function acceptPortalSchoolInvitation(code: string) {
  const response = await apiRequest<Record<string, unknown>>("/api/public/portal/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo aceptar la invitacion");
  }

  return response.data;
}

export async function reportPortalContent(payload: {
  contentType: "post" | "profile";
  contentId: string;
  reason: PortalContentReportReason;
  description?: string | null;
}) {
  const response = await apiRequest<Record<string, unknown>>("/api/public/portal/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear el reporte");
  }

  return response.data;
}

export async function listPortalOwnReports(params?: {
  status?: PortalContentReportStatus;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<PortalContentReport>> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/reports${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar reportes");
  }

  return toPaginated(response.data, (raw) => ({
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? ""),
    contentType: raw.content_type === "profile" ? "profile" : "post",
    contentId: String(raw.content_id ?? ""),
    reportedByUserId: String(raw.reported_by_user_id ?? ""),
    reason: (raw.reason as PortalContentReportReason) ?? "other",
    description: (raw.description as string | null | undefined) ?? null,
    status: (raw.status as PortalContentReportStatus) ?? "open",
    actionTaken: (raw.action_taken as PortalContentReport["actionTaken"] | undefined) ?? null,
    moderatorUserId: (raw.moderator_user_id as string | null | undefined) ?? null,
    resolutionNotes: (raw.resolution_notes as string | null | undefined) ?? null,
    resolvedAt: (raw.resolved_at as string | null | undefined) ?? null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? new Date().toISOString()),
  }));
}

export async function listAdminPortalReports(params?: {
  status?: PortalContentReportStatus;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<PortalContentReport>> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/admin/portal/reports${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar reportes de moderacion");
  }

  return toPaginated(response.data, (raw) => ({
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? ""),
    contentType: raw.content_type === "profile" ? "profile" : "post",
    contentId: String(raw.content_id ?? ""),
    reportedByUserId: String(raw.reported_by_user_id ?? ""),
    reason: (raw.reason as PortalContentReportReason) ?? "other",
    description: (raw.description as string | null | undefined) ?? null,
    status: (raw.status as PortalContentReportStatus) ?? "open",
    actionTaken: (raw.action_taken as PortalContentReport["actionTaken"] | undefined) ?? null,
    moderatorUserId: (raw.moderator_user_id as string | null | undefined) ?? null,
    resolutionNotes: (raw.resolution_notes as string | null | undefined) ?? null,
    resolvedAt: (raw.resolved_at as string | null | undefined) ?? null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? new Date().toISOString()),
  }));
}

export async function resolvePortalReport(
  reportId: string,
  payload: {
    status: PortalContentReportStatus;
    actionTaken?: "none" | "warned" | "hidden" | "deleted";
    resolutionNotes?: string | null;
  }
): Promise<PortalContentReport> {
  const response = await apiRequest<Record<string, unknown>>(`/api/admin/portal/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar el reporte");
  }

  const raw = response.data;
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenant_id ?? ""),
    contentType: raw.content_type === "profile" ? "profile" : "post",
    contentId: String(raw.content_id ?? ""),
    reportedByUserId: String(raw.reported_by_user_id ?? ""),
    reason: (raw.reason as PortalContentReportReason) ?? "other",
    description: (raw.description as string | null | undefined) ?? null,
    status: (raw.status as PortalContentReportStatus) ?? "open",
    actionTaken: (raw.action_taken as PortalContentReport["actionTaken"] | undefined) ?? null,
    moderatorUserId: (raw.moderator_user_id as string | null | undefined) ?? null,
    resolutionNotes: (raw.resolution_notes as string | null | undefined) ?? null,
    resolvedAt: (raw.resolved_at as string | null | undefined) ?? null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export async function followPortalProfile(profileId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/public/portal/follow/${profileId}`, {
    method: "POST",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo seguir el perfil");
  }

  return true;
}

export async function unfollowPortalProfile(profileId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/public/portal/follow/${profileId}`, {
    method: "DELETE",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo dejar de seguir el perfil");
  }

  return true;
}

export async function followPortalSchool(tenantId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/public/portal/follow-school/${tenantId}`, {
    method: "POST",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo seguir la escuela");
  }

  return true;
}

export async function unfollowPortalSchool(tenantId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/public/portal/follow-school/${tenantId}`, {
    method: "DELETE",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo dejar de seguir la escuela");
  }

  return true;
}

export async function listFollowedPortalSchools(limit = 50): Promise<PortalFollowedSchool[]> {
  const response = await apiRequest<Array<Record<string, unknown>>>(`/api/public/portal/followed-schools?limit=${limit}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar escuelas seguidas");
  }

  return response.data.map((item) => {
    const schoolRaw = item.school && typeof item.school === "object" ? (item.school as Record<string, unknown>) : {};
    return {
      tenantId: String(item.tenantId ?? ""),
      createdAt: String(item.createdAt ?? new Date().toISOString()),
      school: {
        tenantId: String(schoolRaw.tenantId ?? ""),
        name: String(schoolRaw.name ?? "Escuela"),
        slug: String(schoolRaw.slug ?? ""),
        location: (schoolRaw.location as string | null | undefined) ?? null,
        logoUrl: (schoolRaw.logoUrl as string | null | undefined) ?? null,
        isPublic: Boolean(schoolRaw.isPublic),
      },
    };
  });
}

export async function getPortalContext(): Promise<PortalContextResponse> {
  const response = await apiRequest<PortalContextResponse>("/api/public/portal/context");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar el contexto del portal");
  }

  return response.data;
}

export async function listPortalNotifications(params?: { onlyUnread?: boolean; limit?: number }) {
  const search = new URLSearchParams();
  if (typeof params?.onlyUnread === "boolean") search.set("onlyUnread", String(params.onlyUnread));
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));

  const response = await apiRequest<Array<Record<string, unknown>>>(
    `/api/public/portal/notifications${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar las notificaciones");
  }

  return response.data.map((item) => ({
    id: String(item.id ?? ""),
    tenantId: (item.tenant_id as string | null | undefined) ?? null,
    type: String(item.type ?? "notification"),
    title: String(item.title ?? "Notificacion"),
    message: String(item.message ?? ""),
    actionUrl: (item.action_url as string | null | undefined) ?? null,
    metadata: (item.metadata as Record<string, unknown> | undefined) ?? {},
    isRead: Boolean(item.is_read),
    readAt: (item.read_at as string | null | undefined) ?? null,
    createdAt: String(item.created_at ?? new Date().toISOString()),
  } satisfies PortalNotificationItem));
}

export async function getPortalNotificationContracts(): Promise<PortalNotificationContractResponse> {
  const response = await apiRequest<PortalNotificationContractResponse>("/api/public/portal/notifications/contracts");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar el contrato de notificaciones");
  }

  return response.data;
}

export async function getPortalPricingFeatureMatrix(): Promise<PortalPlanFeatureMatrixResponse> {
  const response = await apiRequest<PortalPlanFeatureMatrixResponse>("/api/public/portal/pricing/feature-matrix");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar la matriz de plan por feature");
  }

  return response.data;
}

export async function getPortalAnalyticsKpiDefinitions(): Promise<PortalKpiContractResponse> {
  const response = await apiRequest<PortalKpiContractResponse>("/api/school/portal/analytics/kpis");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar el contrato de KPIs");
  }

  return response.data;
}

export async function markPortalNotificationAsRead(notificationId: string) {
  const response = await apiRequest<Record<string, unknown>>(`/api/public/portal/notifications/${notificationId}/read`, {
    method: "POST",
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo marcar la notificación como leída");
  }

  return response.data;
}

export async function savePortalItem(itemType: "post" | "event", itemId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/public/portal/save/${itemType}/${itemId}`, {
    method: "POST",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo guardar el elemento");
  }

  return true;
}

export async function unsavePortalItem(itemType: "post" | "event", itemId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/public/portal/save/${itemType}/${itemId}`, {
    method: "DELETE",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo quitar de guardados");
  }

  return true;
}

export async function listSavedPortalItems(params?: {
  itemType?: "post" | "event";
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.itemType) search.set("itemType", params.itemType);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/public/portal/saved${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar los guardados");
  }

  return toPaginated(response.data, (item) => ({
    id: String(item.id ?? ""),
    itemType: item.itemType === "event" ? "event" : "post",
    itemId: String(item.itemId ?? ""),
    tenantId: (item.tenantId as string | null | undefined) ?? null,
    createdAt: String(item.createdAt ?? new Date().toISOString()),
  } satisfies PortalSavedItem));
}

export async function listPortalFollowers(profileId: string): Promise<PortalFollowerItem[]> {
  const response = await apiRequest<Array<Record<string, unknown>>>(`/api/public/portal/followers/${profileId}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar los seguidores");
  }

  return response.data.map((item) => ({
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    profile:
      item.profile && typeof item.profile === "object"
        ? toPublicProfileSummary(item.profile as Record<string, unknown>)
        : null,
  }));
}

export async function listPortalFollowing(profileId: string): Promise<PortalFollowerItem[]> {
  const response = await apiRequest<Array<Record<string, unknown>>>(`/api/public/portal/following/${profileId}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar los seguidos");
  }

  return response.data.map((item) => ({
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    profile:
      item.profile && typeof item.profile === "object"
        ? toPublicProfileSummary(item.profile as Record<string, unknown>)
        : null,
  }));
}

export async function getPublicPortalTeacherProfile(teacherId: string): Promise<PortalTeacherPublicProfile | null> {
  const response = await apiRequest<Record<string, unknown>>(`/api/public/portal/teachers/${teacherId}`);

  if (!response.success) {
    if (response.error?.code === "not_found") {
      return null;
    }
    throw new Error(response.error?.message || "No se pudo cargar el perfil del profesor");
  }

  if (!response.data) {
    return null;
  }

  return {
    id: String(response.data.id ?? ""),
    tenantId: String(response.data.tenantId ?? ""),
    schoolName: String(response.data.schoolName ?? "Escuela"),
    name: String(response.data.name ?? ""),
    email: (response.data.email as string | null | undefined) ?? null,
    phone: (response.data.phone as string | null | undefined) ?? null,
    bio: (response.data.bio as string | null | undefined) ?? null,
    status: String(response.data.status ?? "active"),
    classesCount: typeof response.data.classesCount === "number" ? response.data.classesCount : 0,
  };
}

export async function updateSchoolPortalProfile(payload: PortalSchoolProfileInput) {
  const response = await apiRequest<Record<string, unknown>>("/api/school/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar el perfil de la escuela");
  }

  return toPortalSchool(response.data);
}

export async function getSchoolPortalAnalytics(): Promise<PortalSchoolAnalytics> {
  const response = await apiRequest<Record<string, unknown>>("/api/school/analytics");

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar la analitica de escuela");
  }

  return {
    studentsCount: typeof response.data.studentsCount === "number" ? response.data.studentsCount : 0,
    activeClassesCount: typeof response.data.activeClassesCount === "number" ? response.data.activeClassesCount : 0,
    postsCount: typeof response.data.postsCount === "number" ? response.data.postsCount : 0,
    eventsCount: typeof response.data.eventsCount === "number" ? response.data.eventsCount : 0,
    followersCount: typeof response.data.followersCount === "number" ? response.data.followersCount : 0,
    viewsCount: typeof response.data.viewsCount === "number" ? response.data.viewsCount : 0,
    conversionRate: typeof response.data.conversionRate === "number" ? response.data.conversionRate : 0,
    lastActivityAt: (response.data.lastActivityAt as string | null | undefined) ?? null,
  };
}

export async function listSchoolPortalPosts(params?: {
  type?: PortalFeedType;
  approvalStatus?: "draft" | "pending_approval" | "published" | "rejected";
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.type) search.set("type", params.type);
  if (params?.approvalStatus) search.set("approvalStatus", params.approvalStatus);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/school/posts${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar las publicaciones");
  }

  return toPaginated(response.data, toPortalFeedPost);
}

export async function createSchoolPortalPost(payload: {
  authorType?: "school" | "teacher";
  authorName: string;
  authorAvatarUrl?: string | null;
  type: PortalFeedType;
  content: string;
  imageUrls?: string[];
  videoUrl?: string | null;
  mediaIds?: string[];
  isPublic?: boolean;
  visibilityScope?: PortalFeedVisibilityScope;
}) {
  const response = await apiRequest<Record<string, unknown>>("/api/school/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear la publicacion");
  }

  return toPortalFeedPost(response.data);
}

export async function updateSchoolPortalPost(postId: string, payload: Partial<{
  authorType: "school" | "teacher";
  authorName: string;
  authorAvatarUrl: string | null;
  type: PortalFeedType;
  content: string;
  imageUrls: string[];
  videoUrl: string | null;
  mediaIds: string[];
  isPublic: boolean;
  visibilityScope: PortalFeedVisibilityScope;
}>) {
  const response = await apiRequest<Record<string, unknown>>(`/api/school/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo actualizar la publicacion");
  }

  return toPortalFeedPost(response.data);
}

export async function deleteSchoolPortalPost(postId: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/school/posts/${postId}`, {
    method: "DELETE",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo eliminar la publicacion");
  }

  return true;
}

export async function uploadPortalMediaFile(payload: {
  file: File;
  kind?: "image" | "video";
  isPublic?: boolean;
}): Promise<PortalMediaAsset> {
  const formData = new FormData();
  formData.append("file", payload.file);
  if (payload.kind) {
    formData.append("kind", payload.kind);
  }
  if (typeof payload.isPublic === "boolean") {
    formData.append("isPublic", String(payload.isPublic));
  }

  const response = await apiRequest<Record<string, unknown>>("/api/media/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo subir el archivo multimedia");
  }

  return toPortalMediaAsset(response.data);
}

export async function createPortalMediaFromUrl(payload: {
  url: string;
  kind?: "image" | "video";
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  isPublic?: boolean;
}): Promise<PortalMediaAsset> {
  const response = await apiRequest<Record<string, unknown>>("/api/media/upload", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo registrar el recurso multimedia");
  }

  return toPortalMediaAsset(response.data);
}

export async function getPortalMediaAsset(id: string): Promise<PortalMediaAsset> {
  const response = await apiRequest<Record<string, unknown>>(`/api/media/${id}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar el recurso multimedia");
  }

  return toPortalMediaAsset(response.data);
}

export async function deletePortalMediaAsset(id: string) {
  const response = await apiRequest<{ success: boolean }>(`/api/media/${id}`, {
    method: "DELETE",
  });

  if (!response.success) {
    throw new Error(response.error?.message || "No se pudo eliminar el recurso multimedia");
  }

  return true;
}

export async function approveTeacherPortalPost(postId: string, notes?: string) {
  const response = await apiRequest<Record<string, unknown>>(`/api/admin/portal/feed-posts/${postId}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo aprobar la publicacion");
  }

  return toPortalFeedPost(response.data);
}

export async function rejectTeacherPortalPost(postId: string, notes?: string) {
  const response = await apiRequest<Record<string, unknown>>(`/api/admin/portal/feed-posts/${postId}/reject`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo rechazar la publicacion");
  }

  return toPortalFeedPost(response.data);
}

export async function listSchoolAnnouncements(): Promise<PortalSchoolAnnouncement[]> {
  const response = await apiRequest<Array<Record<string, unknown>>>("/api/school/announcements");
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar los anuncios");
  }

  return response.data.map((item) => ({
    ...toPortalFeedPost(item),
    announcementTitle: (item.announcementTitle as string | undefined) ?? undefined,
    isImportant: typeof item.isImportant === "boolean" ? item.isImportant : undefined,
    isUrgent: typeof item.isUrgent === "boolean" ? item.isUrgent : undefined,
  }));
}

export async function createSchoolAnnouncement(payload: {
  title: string;
  content: string;
  isImportant?: boolean;
  isUrgent?: boolean;
  notifyAll?: boolean;
}) {
  const response = await apiRequest<Record<string, unknown>>("/api/school/announcements", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear el anuncio");
  }

  return response.data;
}

export async function listStudentAnnouncements(tenantId?: string): Promise<PortalFeedPost[]> {
  const search = new URLSearchParams();
  if (tenantId) search.set("tenantId", tenantId);

  const response = await apiRequest<Array<Record<string, unknown>>>(
    `/api/student/announcements${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar anuncios para alumno");
  }

  return response.data.map(toPortalFeedPost);
}

export async function listSchoolGalleryAlbums(): Promise<PortalGalleryAlbum[]> {
  const response = await apiRequest<Array<Record<string, unknown>>>("/api/school/albums");
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar los albumes");
  }
  return response.data.map(toPortalGalleryAlbum);
}

export async function createSchoolGalleryAlbum(payload: {
  name: string;
  description?: string | null;
  eventId?: string | null;
  isPublic?: boolean;
}) {
  const response = await apiRequest<Record<string, unknown>>("/api/school/albums", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear el album");
  }

  return toPortalGalleryAlbum(response.data);
}

export async function uploadSchoolGalleryPhoto(payload: {
  albumId: string;
  imageUrl: string;
  caption?: string | null;
  eventId?: string | null;
  isPublic?: boolean;
}) {
  const response = await apiRequest<Record<string, unknown>>("/api/school/photos", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo subir la foto");
  }

  return toPortalGalleryPhoto(response.data);
}

export async function listPhotosByAlbum(albumId: string, params?: { tenantId?: string; limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.tenantId) search.set("tenantId", params.tenantId);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));

  const response = await apiRequest<Record<string, unknown>>(
    `/api/school/photos/album/${albumId}${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar fotos del album");
  }

  return toPaginated(response.data, toPortalGalleryPhoto);
}

export async function listTeacherClasses(tenantId?: string) {
  const search = new URLSearchParams();
  if (tenantId) search.set("tenantId", tenantId);

  const response = await apiRequest<Record<string, unknown>>(
    `/api/teacher/classes${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudieron cargar clases del profesor");
  }

  const classesRaw = Array.isArray(response.data.classes) ? response.data.classes : [];

  return {
    teacher: response.data.teacher as Record<string, unknown>,
    classes: classesRaw.map((item) => ({
      id: String((item as Record<string, unknown>).id ?? ""),
      tenantId: String((item as Record<string, unknown>).tenant_id ?? ""),
      name: String((item as Record<string, unknown>).name ?? ""),
      roomId: ((item as Record<string, unknown>).room_id as string | null | undefined) ?? null,
      disciplineId: ((item as Record<string, unknown>).discipline_id as string | null | undefined) ?? null,
      categoryId: ((item as Record<string, unknown>).category_id as string | null | undefined) ?? null,
      status: String((item as Record<string, unknown>).status ?? "active"),
      capacity: typeof (item as Record<string, unknown>).capacity === "number" ? ((item as Record<string, unknown>).capacity as number) : 0,
      teachers: Array.isArray((item as Record<string, unknown>).teachers)
        ? ((item as Record<string, unknown>).teachers as Array<Record<string, unknown>>).map((teacher) => ({
            id: String(teacher.id ?? ""),
            name: String(teacher.name ?? ""),
          }))
        : [],
    } satisfies PortalTeacherClass)),
  };
}

export async function listTeacherSchedule(tenantId?: string) {
  const search = new URLSearchParams();
  if (tenantId) search.set("tenantId", tenantId);

  const response = await apiRequest<Record<string, unknown>>(
    `/api/teacher/schedule${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar el horario del profesor");
  }

  const scheduleRaw = Array.isArray(response.data.schedule) ? response.data.schedule : [];
  return {
    teacher: response.data.teacher as Record<string, unknown>,
    schedule: scheduleRaw.map((slot) => ({
      id: String((slot as Record<string, unknown>).id ?? ""),
      class_id: String((slot as Record<string, unknown>).class_id ?? ""),
      class_name: String((slot as Record<string, unknown>).class_name ?? "Clase"),
      weekday: typeof (slot as Record<string, unknown>).weekday === "number" ? ((slot as Record<string, unknown>).weekday as number) : 1,
      start_time: String((slot as Record<string, unknown>).start_time ?? "00:00"),
      end_time: String((slot as Record<string, unknown>).end_time ?? "00:00"),
      room_id: ((slot as Record<string, unknown>).room_id as string | null | undefined) ?? null,
    } satisfies PortalTeacherScheduleSlot)),
  };
}

export async function listTeacherClassStudents(classId: string, tenantId?: string) {
  const search = new URLSearchParams();
  if (tenantId) search.set("tenantId", tenantId);

  const response = await apiRequest<Record<string, unknown>>(
    `/api/teacher/classes/${classId}/students${search.toString() ? `?${search.toString()}` : ""}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo cargar el roster de alumnos");
  }

  const studentsRaw = Array.isArray(response.data.students) ? response.data.students : [];
  return {
    teacher: response.data.teacher as Record<string, unknown>,
    classInfo: response.data.class as Record<string, unknown>,
    students: studentsRaw.map((item) => ({
      enrollmentId: String((item as Record<string, unknown>).enrollmentId ?? ""),
      studentId: String((item as Record<string, unknown>).studentId ?? ""),
      name: String((item as Record<string, unknown>).name ?? "Alumno"),
      email: ((item as Record<string, unknown>).email as string | null | undefined) ?? null,
      phone: ((item as Record<string, unknown>).phone as string | null | undefined) ?? null,
    } satisfies PortalTeacherRosterStudent)),
  };
}

export async function createTeacherPortalPost(payload: {
  tenantId?: string;
  type: PortalFeedType;
  content: string;
  imageUrls?: string[];
  videoUrl?: string | null;
  mediaIds?: string[];
  isPublic?: boolean;
  visibilityScope?: PortalFeedVisibilityScope;
  requiresApproval?: boolean;
}) {
  const response = await apiRequest<Record<string, unknown>>("/api/teacher/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || "No se pudo crear la publicacion del profesor");
  }

  return response.data;
}
