import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { outboxService } from "@/lib/services/outboxService";
import { examSubscriptionService } from "@/lib/services/examSubscriptionService";
import { examRoleService } from "@/lib/services/examRoleService";
import type {
  ListExamNotificationDispatchesInput,
  TriggerExamNotificationsInput,
} from "@/lib/validators/examCoreSchemas";

type ExamNotificationEventType = "enrollment_open" | "enrollment_closed" | "result_available";
type ExamNotificationDeliveryStatus = "queued" | "processing" | "sent" | "failed";

interface SessionRow {
  id: string;
  organization_id: string | null;
  school_id: string | null;
  title: string;
  enrollment_start: string | null;
  enrollment_end: string | null;
  status: "draft" | "published" | "enrollment_open" | "closed" | "evaluated" | "certified";
}

interface SchoolRecipient {
  schoolId: string;
  schoolName: string;
  emails: string[];
}

interface TriggerInput extends TriggerExamNotificationsInput {
  actorUserId: string;
}

interface ListDispatchesInput extends ListExamNotificationDispatchesInput {
  actorUserId: string;
}

interface NotificationDispatchRow {
  id: string;
  school_id: string;
  exam_session_id: string;
  event_type: ExamNotificationEventType;
  recipient_email: string;
  recipient_name: string | null;
  status: ExamNotificationDeliveryStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  sent_at: string | null;
  last_error: string | null;
  outbox_audit_id: string | null;
  delivery_logs: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface OutboxState {
  status: ExamNotificationDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  sentAt: string | null;
  lastError: string | null;
  provider: string | null;
  providerMessageId: string | null;
}

const DEFAULT_EVENTS: ExamNotificationEventType[] = [
  "enrollment_open",
  "enrollment_closed",
  "result_available",
];

function toIsoDay(value: Date): string {
  return value.toISOString().split("T")[0];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((item) => item?.trim()).filter((item): item is string => Boolean(item))));
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function buildDispatchKey(input: {
  sessionId: string;
  eventType: string;
  schoolId: string;
  email: string;
}) {
  return `${input.sessionId}:${input.eventType}:${input.schoolId}:${normalizeEmail(input.email)}`;
}

function asDeliveryLogs(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : [];
}

function parseOutboxState(metadata: Record<string, unknown> | null | undefined): OutboxState | null {
  if (!metadata || metadata.channel !== "email") {
    return null;
  }

  const status = typeof metadata.status === "string" ? metadata.status : "queued";
  if (status !== "queued" && status !== "processing" && status !== "sent" && status !== "failed") {
    return null;
  }

  return {
    status,
    attempts: typeof metadata.attempts === "number" ? metadata.attempts : 0,
    maxAttempts: typeof metadata.maxAttempts === "number" ? metadata.maxAttempts : 3,
    nextAttemptAt: typeof metadata.nextAttemptAt === "string" ? metadata.nextAttemptAt : null,
    sentAt: typeof metadata.sentAt === "string" ? metadata.sentAt : null,
    lastError: typeof metadata.lastError === "string" ? metadata.lastError : null,
    provider: typeof metadata.provider === "string" ? metadata.provider : null,
    providerMessageId: typeof metadata.providerMessageId === "string" ? metadata.providerMessageId : null,
  };
}

function detectSessionEvents(input: {
  session: SessionRow;
  todayIso: string;
  sessionsWithPublishedResults: Set<string>;
  wantedEvents: Set<ExamNotificationEventType>;
}): ExamNotificationEventType[] {
  const events: ExamNotificationEventType[] = [];
  const { session, todayIso, sessionsWithPublishedResults, wantedEvents } = input;
  const enrollmentStart = session.enrollment_start;
  const enrollmentEnd = session.enrollment_end;

  const isEnrollmentOpenNow =
    session.status === "enrollment_open"
    && Boolean(enrollmentStart)
    && enrollmentStart !== null
    && enrollmentStart <= todayIso
    && (!enrollmentEnd || enrollmentEnd >= todayIso);

  if (wantedEvents.has("enrollment_open") && isEnrollmentOpenNow) {
    events.push("enrollment_open");
  }

  const isEnrollmentClosed =
    Boolean(enrollmentEnd && enrollmentEnd < todayIso)
    || session.status === "closed"
    || session.status === "evaluated"
    || session.status === "certified";

  if (wantedEvents.has("enrollment_closed") && isEnrollmentClosed) {
    events.push("enrollment_closed");
  }

  if (wantedEvents.has("result_available") && sessionsWithPublishedResults.has(session.id)) {
    events.push("result_available");
  }

  return events;
}

function buildEmailContent(input: {
  eventType: ExamNotificationEventType;
  session: SessionRow;
  schoolName: string;
}): { subject: string; html: string; text: string } {
  const { eventType, session, schoolName } = input;
  const enrollmentWindow = [session.enrollment_start || "-", session.enrollment_end || "-"];

  if (eventType === "enrollment_open") {
    return {
      subject: `Matricula abierta: ${session.title}`,
      html: `<p>Hola ${schoolName},</p><p>La matricula ya esta abierta para la sesion de examenes <strong>${session.title}</strong>.</p><p>Ventana de matricula: <strong>${enrollmentWindow[0]}</strong> a <strong>${enrollmentWindow[1]}</strong>.</p>`,
      text: `Hola ${schoolName}. La matricula ya esta abierta para la sesion de examenes ${session.title}. Ventana de matricula: ${enrollmentWindow[0]} a ${enrollmentWindow[1]}.`,
    };
  }

  if (eventType === "enrollment_closed") {
    return {
      subject: `Matricula cerrada: ${session.title}`,
      html: `<p>Hola ${schoolName},</p><p>La matricula ha cerrado para la sesion de examenes <strong>${session.title}</strong>.</p><p>Si necesitas soporte para incidencias, revisa el panel de ExamSuit.</p>`,
      text: `Hola ${schoolName}. La matricula ha cerrado para la sesion de examenes ${session.title}. Si necesitas soporte para incidencias, revisa el panel de ExamSuit.`,
    };
  }

  return {
    subject: `Resultados disponibles: ${session.title}`,
    html: `<p>Hola ${schoolName},</p><p>Ya hay resultados disponibles para la sesion de examenes <strong>${session.title}</strong>.</p><p>Puedes revisar el detalle en el modulo de resultados.</p>`,
    text: `Hola ${schoolName}. Ya hay resultados disponibles para la sesion de examenes ${session.title}. Puedes revisar el detalle en el modulo de resultados.`,
  };
}

async function getManageableScope(userId: string) {
  const scope = await examRoleService.listManageableScopeByPermission(userId, "notifications.trigger");
  return {
    manageableOrganizationIds: uniqueStrings(scope.organizationIds),
    manageableSchoolIds: uniqueStrings(scope.schoolIds),
  };
}

async function listCandidateSessions(input: {
  userId: string;
  sessionIds?: string[];
}) {
  const scope = await getManageableScope(input.userId);

  if (scope.manageableOrganizationIds.length === 0 && scope.manageableSchoolIds.length === 0) {
    return [] as SessionRow[];
  }

  let query = supabaseAdmin
    .from("exam_sessions")
    .select("id, organization_id, school_id, title, enrollment_start, enrollment_end, status")
    .order("start_date", { ascending: false });

  if (scope.manageableOrganizationIds.length > 0 && scope.manageableSchoolIds.length > 0) {
    query = query.or(
      `organization_id.in.(${scope.manageableOrganizationIds.join(",")}),school_id.in.(${scope.manageableSchoolIds.join(",")})`
    );
  } else if (scope.manageableOrganizationIds.length > 0) {
    query = query.in("organization_id", scope.manageableOrganizationIds);
  } else {
    query = query.in("school_id", scope.manageableSchoolIds);
  }

  if (input.sessionIds && input.sessionIds.length > 0) {
    query = query.in("id", input.sessionIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list candidate exam sessions: ${error.message}`);
  }

  return (data || []) as SessionRow[];
}

async function listSessionsWithPublishedResults(sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return new Set<string>();
  }

  const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
    .from("exam_enrollments")
    .select("id, exam_session_id")
    .in("exam_session_id", sessionIds);

  if (enrollmentsError) {
    throw new Error(`Failed to load exam enrollments for notifications: ${enrollmentsError.message}`);
  }

  const enrollmentRows = (enrollments || []) as Array<{ id: string; exam_session_id: string }>;
  if (enrollmentRows.length === 0) {
    return new Set<string>();
  }

  const enrollmentToSession = new Map<string, string>();
  for (const row of enrollmentRows) {
    enrollmentToSession.set(row.id, row.exam_session_id);
  }

  const { data: results, error: resultsError } = await supabaseAdmin
    .from("exam_results")
    .select("enrollment_id, status")
    .in("enrollment_id", Array.from(enrollmentToSession.keys()))
    .neq("status", "pending");

  if (resultsError) {
    throw new Error(`Failed to load exam results for notifications: ${resultsError.message}`);
  }

  const sessions = new Set<string>();
  for (const row of (results || []) as Array<{ enrollment_id: string; status: string }>) {
    const sessionId = enrollmentToSession.get(row.enrollment_id);
    if (sessionId) {
      sessions.add(sessionId);
    }
  }

  return sessions;
}

async function listSchoolRecipientsBySession(session: SessionRow) {
  const schoolIds = new Set<string>();

  if (session.school_id) {
    schoolIds.add(session.school_id);
  }

  if (session.organization_id) {
    const [{ data: memberships, error: membershipsError }, { data: invited, error: invitedError }] = await Promise.all([
      supabaseAdmin
        .from("exam_memberships")
        .select("school_id")
        .eq("organization_id", session.organization_id),
      supabaseAdmin
        .from("exam_school_access")
        .select("school_id")
        .eq("exam_session_id", session.id),
    ]);

    if (membershipsError) {
      throw new Error(`Failed to resolve organization schools for notifications: ${membershipsError.message}`);
    }

    if (invitedError) {
      throw new Error(`Failed to resolve invited schools for notifications: ${invitedError.message}`);
    }

    for (const row of (memberships || []) as Array<{ school_id: string }>) {
      if (row.school_id) schoolIds.add(row.school_id);
    }

    for (const row of (invited || []) as Array<{ school_id: string }>) {
      if (row.school_id) schoolIds.add(row.school_id);
    }
  }

  const schoolIdList = Array.from(schoolIds);
  if (schoolIdList.length === 0) {
    return [] as SchoolRecipient[];
  }

  const [{ data: schools, error: schoolsError }, { data: memberships, error: membershipsError }] = await Promise.all([
    supabaseAdmin
      .from("tenants")
      .select("id, name")
      .in("id", schoolIdList),
    supabaseAdmin
      .from("tenant_memberships")
      .select("tenant_id, user_id, role")
      .in("tenant_id", schoolIdList)
      .eq("is_active", true)
      .in("role", ["owner", "admin"]),
  ]);

  if (schoolsError) {
    throw new Error(`Failed to load school names for notifications: ${schoolsError.message}`);
  }

  if (membershipsError) {
    throw new Error(`Failed to load school memberships for notifications: ${membershipsError.message}`);
  }

  const membershipRows = (memberships || []) as Array<{ tenant_id: string; user_id: string; role: string }>;
  const userIds = uniqueStrings(membershipRows.map((row) => row.user_id));

  const { data: profiles, error: profilesError } = userIds.length
    ? await supabaseAdmin
        .from("user_profiles")
        .select("id, email")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(`Failed to load school contact emails for notifications: ${profilesError.message}`);
  }

  const schoolNameById = new Map<string, string>();
  for (const row of (schools || []) as Array<{ id: string; name: string }>) {
    schoolNameById.set(row.id, row.name || "Escuela");
  }

  const emailByUserId = new Map<string, string>();
  for (const row of (profiles || []) as Array<{ id: string; email: string | null }>) {
    if (row.email) {
      emailByUserId.set(row.id, row.email);
    }
  }

  const emailsBySchoolId = new Map<string, Set<string>>();
  for (const row of membershipRows) {
    const email = emailByUserId.get(row.user_id);
    if (!email) {
      continue;
    }

    const bucket = emailsBySchoolId.get(row.tenant_id) ?? new Set<string>();
    bucket.add(email);
    emailsBySchoolId.set(row.tenant_id, bucket);
  }

  return schoolIdList.map((schoolId) => ({
    schoolId,
    schoolName: schoolNameById.get(schoolId) || "Escuela",
    emails: Array.from(emailsBySchoolId.get(schoolId) || []),
  }));
}

async function listAlreadySentKeys(sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabaseAdmin
    .from("audit_log")
    .select("entity_id, metadata")
    .eq("action", "exam_notification_sent")
    .eq("entity_type", "exam_session")
    .in("entity_id", sessionIds)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(`Failed to load previous exam notifications: ${error.message}`);
  }

  const keys = new Set<string>();
  for (const row of (data || []) as Array<{ entity_id: string | null; metadata: Record<string, unknown> | null }>) {
    const eventType = row.metadata && typeof row.metadata === "object"
      ? row.metadata.eventType
      : null;
    const schoolId = row.metadata && typeof row.metadata === "object"
      ? row.metadata.schoolId
      : null;

    if (typeof row.entity_id !== "string") {
      continue;
    }

    if (typeof eventType !== "string" || typeof schoolId !== "string") {
      continue;
    }

    keys.add(`${row.entity_id}:${eventType}:${schoolId}`);
  }

  return keys;
}

async function listExistingDispatchKeys(sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabaseAdmin
    .from("exam_notification_dispatches")
    .select("exam_session_id, event_type, school_id, recipient_email, status")
    .in("exam_session_id", sessionIds)
    .in("status", ["queued", "processing", "sent"])
    .limit(5000);

  if (error) {
    throw new Error(`Failed to load existing notification dispatches: ${error.message}`);
  }

  const keys = new Set<string>();
  for (const row of (data || []) as Array<{
    exam_session_id: string;
    event_type: string;
    school_id: string;
    recipient_email: string;
  }>) {
    keys.add(buildDispatchKey({
      sessionId: row.exam_session_id,
      eventType: row.event_type,
      schoolId: row.school_id,
      email: row.recipient_email,
    }));
  }

  return keys;
}

async function syncDispatchStatusesForTenant(tenantId: string, limit = 200) {
  const { data: dispatchRows, error: dispatchError } = await supabaseAdmin
    .from("exam_notification_dispatches")
    .select("id, status, attempts, max_attempts, next_attempt_at, sent_at, last_error, outbox_audit_id, delivery_logs")
    .eq("school_id", tenantId)
    .in("status", ["queued", "processing", "failed"])
    .not("outbox_audit_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (dispatchError) {
    throw new Error(`Failed to load dispatch rows for synchronization: ${dispatchError.message}`);
  }

  const rows = (dispatchRows || []) as Array<Pick<NotificationDispatchRow,
    "id" | "status" | "attempts" | "max_attempts" | "next_attempt_at" | "sent_at" | "last_error" | "outbox_audit_id" | "delivery_logs"
  >>;

  const outboxIds = uniqueStrings(rows.map((row) => row.outbox_audit_id));
  if (outboxIds.length === 0) {
    return { synced: 0 };
  }

  const { data: outboxRows, error: outboxError } = await supabaseAdmin
    .from("audit_log")
    .select("id, metadata")
    .in("id", outboxIds);

  if (outboxError) {
    throw new Error(`Failed to load outbox metadata for synchronization: ${outboxError.message}`);
  }

  const outboxById = new Map<string, Record<string, unknown>>();
  for (const row of (outboxRows || []) as Array<{ id: string; metadata: Record<string, unknown> | null }>) {
    outboxById.set(row.id, row.metadata || {});
  }

  let synced = 0;
  for (const row of rows) {
    if (!row.outbox_audit_id) {
      continue;
    }

    const outboxState = parseOutboxState(outboxById.get(row.outbox_audit_id));
    if (!outboxState) {
      continue;
    }

    const hasChange =
      row.status !== outboxState.status
      || row.attempts !== outboxState.attempts
      || row.max_attempts !== outboxState.maxAttempts
      || row.next_attempt_at !== outboxState.nextAttemptAt
      || row.sent_at !== outboxState.sentAt
      || row.last_error !== outboxState.lastError;

    if (!hasChange) {
      continue;
    }

    const logs = asDeliveryLogs(row.delivery_logs);
    logs.push({
      at: new Date().toISOString(),
      status: outboxState.status,
      attempts: outboxState.attempts,
      error: outboxState.lastError,
      provider: outboxState.provider,
      providerMessageId: outboxState.providerMessageId,
    });

    const compactLogs = logs.slice(-20);

    const { error: updateError } = await supabaseAdmin
      .from("exam_notification_dispatches")
      .update({
        status: outboxState.status,
        attempts: outboxState.attempts,
        max_attempts: outboxState.maxAttempts,
        next_attempt_at: outboxState.nextAttemptAt,
        sent_at: outboxState.sentAt,
        last_error: outboxState.lastError,
        delivery_logs: compactLogs,
      })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(`Failed to synchronize dispatch ${row.id}: ${updateError.message}`);
    }

    synced += 1;
  }

  return { synced };
}

export const examNotificationService = {
  async triggerExamNotifications(input: TriggerInput) {
    const wantedEvents = new Set<ExamNotificationEventType>(
      (input.event_types && input.event_types.length > 0 ? input.event_types : DEFAULT_EVENTS)
    );

    const candidateSessions = await listCandidateSessions({
      userId: input.actorUserId,
      sessionIds: input.session_ids,
    });

    const eligibleSessions: SessionRow[] = [];
    for (const session of candidateSessions) {
      try {
        await examSubscriptionService.requireExamFeature(
          {
            organizationId: session.organization_id,
            tenantId: session.school_id,
          },
          "notifications.trigger"
        );
        eligibleSessions.push(session);
      } catch {
        continue;
      }
    }

    const sessionIds = eligibleSessions.map((session) => session.id);
    const [sessionsWithPublishedResults, sentKeys, existingDispatchKeys] = await Promise.all([
      listSessionsWithPublishedResults(sessionIds),
      listAlreadySentKeys(sessionIds),
      listExistingDispatchKeys(sessionIds),
    ]);

    const todayIso = toIsoDay(new Date());
    const touchedSchoolIds = new Set<string>();

    const summary = {
      scannedSessions: candidateSessions.length,
      eligibleSessions: eligibleSessions.length,
      queuedEmails: 0,
      skippedAlreadySent: 0,
      skippedExistingDispatches: 0,
      events: {
        enrollment_open: 0,
        enrollment_closed: 0,
        result_available: 0,
      } as Record<ExamNotificationEventType, number>,
      processedQueue: [] as Array<{ tenantId: string; processed: number; sent: number; failed: number; remainingApprox: number; syncedDispatches: number }>,
    };

    for (const session of eligibleSessions) {
      const events = detectSessionEvents({
        session,
        todayIso,
        sessionsWithPublishedResults,
        wantedEvents,
      });

      if (events.length === 0) {
        continue;
      }

      const recipients = await listSchoolRecipientsBySession(session);
      for (const recipient of recipients) {
        touchedSchoolIds.add(recipient.schoolId);

        for (const eventType of events) {
          const dedupeKey = `${session.id}:${eventType}:${recipient.schoolId}`;
          if (sentKeys.has(dedupeKey)) {
            summary.skippedAlreadySent += 1;
            continue;
          }

          const content = buildEmailContent({
            eventType,
            session,
            schoolName: recipient.schoolName,
          });

          for (const email of recipient.emails) {
            const dispatchKey = buildDispatchKey({
              sessionId: session.id,
              eventType,
              schoolId: recipient.schoolId,
              email,
            });

            if (existingDispatchKeys.has(dispatchKey)) {
              summary.skippedExistingDispatches += 1;
              continue;
            }

            const { data: dispatchRow, error: dispatchInsertError } = await supabaseAdmin
              .from("exam_notification_dispatches")
              .insert({
                organization_id: session.organization_id,
                school_id: recipient.schoolId,
                exam_session_id: session.id,
                event_type: eventType,
                recipient_email: normalizeEmail(email),
                recipient_name: recipient.schoolName,
                status: "queued",
                attempts: 0,
                max_attempts: 3,
                next_attempt_at: new Date().toISOString(),
                metadata: {
                  kind: "exam_notification",
                  eventType,
                  examSessionId: session.id,
                  schoolId: recipient.schoolId,
                  schoolName: recipient.schoolName,
                },
              })
              .select("id")
              .single();

            if (dispatchInsertError) {
              if (dispatchInsertError.code === "23505") {
                summary.skippedExistingDispatches += 1;
                existingDispatchKeys.add(dispatchKey);
                continue;
              }
              throw new Error(`Failed to create notification dispatch row: ${dispatchInsertError.message}`);
            }

            try {
              const outboxAuditId = await outboxService.enqueueEmail({
                tenantId: recipient.schoolId,
                actorUserId: input.actorUserId,
                template: `exam_notification_${eventType}`,
                to: normalizeEmail(email),
                subject: content.subject,
                html: content.html,
                text: content.text,
                metadata: {
                  kind: "exam_notification",
                  eventType,
                  examSessionId: session.id,
                  schoolId: recipient.schoolId,
                  dispatchId: dispatchRow.id,
                },
              });

              const { error: dispatchUpdateError } = await supabaseAdmin
                .from("exam_notification_dispatches")
                .update({
                  outbox_audit_id: outboxAuditId,
                })
                .eq("id", dispatchRow.id);

              if (dispatchUpdateError) {
                throw new Error(`Failed to link dispatch with outbox row: ${dispatchUpdateError.message}`);
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : "Failed to enqueue notification email";

              await supabaseAdmin
                .from("exam_notification_dispatches")
                .update({
                  status: "failed",
                  attempts: 1,
                  last_error: message,
                  delivery_logs: [{ at: new Date().toISOString(), status: "failed", error: message }],
                })
                .eq("id", dispatchRow.id);

              throw new Error(message);
            }

            summary.queuedEmails += 1;
            existingDispatchKeys.add(dispatchKey);
          }

          await supabaseAdmin.from("audit_log").insert({
            tenant_id: recipient.schoolId,
            actor_user_id: input.actorUserId,
            action: "exam_notification_queued",
            entity_type: "exam_session",
            entity_id: session.id,
            metadata: {
              eventType,
              schoolId: recipient.schoolId,
              recipientCount: recipient.emails.length,
            },
          });

          summary.events[eventType] += 1;
          sentKeys.add(dedupeKey);
        }
      }
    }

    if (input.process_queue && touchedSchoolIds.size > 0) {
      for (const tenantId of Array.from(touchedSchoolIds)) {
        const tick = await outboxService.tickTenantEmailQueue(tenantId, input.queue_limit || 20);
        const sync = await syncDispatchStatusesForTenant(tenantId, Math.max((input.queue_limit || 20) * 3, 50));
        summary.processedQueue.push({
          tenantId,
          processed: tick.processed,
          sent: tick.sent,
          failed: tick.failed,
          remainingApprox: tick.remainingApprox,
          syncedDispatches: sync.synced,
        });
      }
    }

    return summary;
  },

  async listNotificationDispatches(input: ListDispatchesInput) {
    const sessions = await listCandidateSessions({
      userId: input.actorUserId,
      sessionIds: input.session_id ? [input.session_id] : undefined,
    });

    const allowedSessionIds = sessions.map((session) => session.id);
    if (allowedSessionIds.length === 0) {
      return {
        items: [] as NotificationDispatchRow[],
        summary: {
          total: 0,
          queued: 0,
          processing: 0,
          sent: 0,
          failed: 0,
        },
      };
    }

    let query = supabaseAdmin
      .from("exam_notification_dispatches")
      .select("id, school_id, exam_session_id, event_type, recipient_email, recipient_name, status, attempts, max_attempts, next_attempt_at, sent_at, last_error, outbox_audit_id, delivery_logs, metadata, created_at")
      .in("exam_session_id", allowedSessionIds)
      .order("created_at", { ascending: false })
      .limit(input.limit || 50);

    if (input.school_id) {
      query = query.eq("school_id", input.school_id);
    }

    if (input.event_type) {
      query = query.eq("event_type", input.event_type);
    }

    if (input.status) {
      query = query.eq("status", input.status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list notification dispatches: ${error.message}`);
    }

    const items = (data || []) as NotificationDispatchRow[];
    return {
      items,
      summary: {
        total: items.length,
        queued: items.filter((item) => item.status === "queued").length,
        processing: items.filter((item) => item.status === "processing").length,
        sent: items.filter((item) => item.status === "sent").length,
        failed: items.filter((item) => item.status === "failed").length,
      },
    };
  },

  async syncQueueStatusForSchool(input: { schoolId: string; limit?: number }) {
    return syncDispatchStatusesForTenant(input.schoolId, input.limit || 200);
  },
};
