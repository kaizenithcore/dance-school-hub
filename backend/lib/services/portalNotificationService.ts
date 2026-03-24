import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export const PORTAL_NOTIFICATION_CONTRACT_VERSION = "1.0.0";

export const PORTAL_NOTIFICATION_TYPES = {
  ANNOUNCEMENT: "announcement_v1",
  ANNOUNCEMENT_URGENT: "announcement_urgent_v1",
  NEW_FOLLOWER: "new_follower_v1",
  POST_LIKE: "post_like_v1",
  SCHOOL_INVITATION_ACCEPTED: "school_invitation_accepted_v1",
  CONTENT_HIDDEN_BY_MODERATION: "content_hidden_by_moderation_v1",
  YOUR_REPORT_RESOLVED: "your_report_resolved_v1",
  TEACHER_POST_APPROVED: "teacher_post_approved_v1",
  TEACHER_POST_REJECTED: "teacher_post_rejected_v1",
  SCHOOL_POST_PUBLISHED: "school_post_published_v1",
  EVENT_ATTENDANCE_CONFIRMED: "event_attendance_confirmed_v1",
  EVENT_UPCOMING_24H: "event_upcoming_24h_v1",
  ACHIEVEMENT_UNLOCKED: "achievement_unlocked_v1",
} as const;

export type PortalNotificationType =
  (typeof PORTAL_NOTIFICATION_TYPES)[keyof typeof PORTAL_NOTIFICATION_TYPES];

interface CreatePortalNotificationInput {
  tenantId: string | null;
  userId: string;
  type: PortalNotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export const PORTAL_NOTIFICATION_CONTRACTS: Array<{
  type: PortalNotificationType;
  title: string;
  description: string;
  metadataFields: string[];
}> = [
  {
    type: PORTAL_NOTIFICATION_TYPES.ANNOUNCEMENT,
    title: "Anuncio de escuela",
    description: "Anuncio general publicado por la escuela",
    metadataFields: ["postId", "isImportant", "isUrgent"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.ANNOUNCEMENT_URGENT,
    title: "Anuncio urgente de escuela",
    description: "Anuncio urgente publicado por la escuela",
    metadataFields: ["postId", "isImportant", "isUrgent"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.NEW_FOLLOWER,
    title: "Nuevo seguidor",
    description: "Un perfil comenzo a seguir al usuario",
    metadataFields: ["followerProfileId"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.POST_LIKE,
    title: "Like en publicacion",
    description: "Una publicacion recibio un nuevo me gusta",
    metadataFields: ["postId"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.SCHOOL_INVITATION_ACCEPTED,
    title: "Invitacion aceptada",
    description: "La cuenta acepto una invitacion de escuela",
    metadataFields: ["invitationId", "tenantId"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.CONTENT_HIDDEN_BY_MODERATION,
    title: "Contenido ocultado",
    description: "Contenido ocultado temporalmente por moderacion",
    metadataFields: ["contentType", "contentId"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.YOUR_REPORT_RESOLVED,
    title: "Reporte actualizado",
    description: "El estado de un reporte fue actualizado",
    metadataFields: ["reportId", "status", "actionTaken"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.TEACHER_POST_APPROVED,
    title: "Post docente aprobado",
    description: "Una publicacion de profesor fue aprobada",
    metadataFields: ["postId", "status"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.TEACHER_POST_REJECTED,
    title: "Post docente rechazado",
    description: "Una publicacion de profesor fue rechazada",
    metadataFields: ["postId", "status"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.SCHOOL_POST_PUBLISHED,
    title: "Nuevo post de escuela",
    description: "La escuela publico nuevo contenido en feed",
    metadataFields: ["postId", "tenantId", "postType", "visibilityScope"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.EVENT_ATTENDANCE_CONFIRMED,
    title: "Asistencia a evento confirmada",
    description: "El alumno confirmo asistencia a un evento",
    metadataFields: ["eventId", "eventName", "startDate"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.EVENT_UPCOMING_24H,
    title: "Evento cercano (24h)",
    description: "Recordatorio de evento a menos de 24h",
    metadataFields: ["eventId", "eventName", "startDate"],
  },
  {
    type: PORTAL_NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED,
    title: "Logro desbloqueado",
    description: "Un alumno desbloqueo un logro de gamificacion",
    metadataFields: ["achievementId", "category", "thresholdValue"],
  },
];

export async function createPortalNotification(input: CreatePortalNotificationInput) {
  const payloadMetadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    contract: "portal.notification",
    contractVersion: PORTAL_NOTIFICATION_CONTRACT_VERSION,
    notificationType: input.type,
    emittedAt: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("user_notifications")
    .insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      action_url: input.actionUrl ?? null,
      metadata: payloadMetadata,
    });

  if (error) {
    // Non-blocking behavior keeps the originating action successful.
    console.error(`Failed to create notification: ${error.message}`);
  }
}

export function getPortalNotificationContract() {
  return {
    contract: "portal.notification",
    contractVersion: PORTAL_NOTIFICATION_CONTRACT_VERSION,
    types: PORTAL_NOTIFICATION_CONTRACTS,
    generatedAt: new Date().toISOString(),
  };
}
