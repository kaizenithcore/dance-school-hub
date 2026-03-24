# Funcionalidad actual y flujos operativos

Fecha de corte: 2026-03-24

## 1) Resumen ejecutivo

Este documento consolida el estado real del sistema tras la implementación del portal, funciones sociales, gestión escuela/profesor, eventos y extensiones de integración.

Estado técnico validado en esta revisión:
- Build frontend: OK
- Tests frontend: OK (1/1)
- Typecheck backend: OK

Resultado: la base funcional principal está operativa y conectada end-to-end entre UI, cliente API y backend.

## 2) Alcance actual implementado

### 2.1 Módulo público y descubrimiento

Objetivo: permitir exploración de escuelas y contenido sin entrar al backoffice.

Incluye:
- Landing pública por escuela y matrícula pública.
- Explorador de escuelas con vistas trending, recomendadas y búsqueda.
- Feed y eventos públicos en portal.
- Comparador de escuelas.
- Métricas públicas de escuela y estadísticas del ecosistema.

Rutas frontend principales:
- /s/:schoolSlug
- /s/:schoolSlug/enroll
- /s/:schoolSlug/schedule
- /portal
- /portal/explorer

Backend asociado (ejemplos clave):
- GET /api/public/portal/schools
- GET /api/public/portal/schools/:slug
- GET /api/public/portal/schools/:slug/metrics
- GET /api/public/portal/schools/trending
- GET /api/public/portal/schools/recommended
- GET /api/public/portal/schools/search
- GET /api/public/portal/schools/compare
- GET /api/public/portal/events
- GET /api/public/portal/feed
- GET /api/public/portal/ecosystem-stats
- GET /api/public/form/:tenantSlug
- POST /api/public/enroll

### 2.2 Portal de alumno (matriculado)

Objetivo: centralizar experiencia académica, eventos, progreso y finanzas del alumno.

Incluye:
- Contexto del alumno y clases activas.
- Horario semanal personalizado.
- Progreso (XP, nivel, racha, logros, historial XP).
- Certificaciones.
- Eventos y confirmación/cancelación de asistencia.
- Historial de participaciones.
- Finanzas: listado de pagos, checkout matrícula, descarga de recibo.
- Exportaciones: calendario ICS y actividad JSON/CSV.

Rutas frontend principales:
- /portal/app
- /portal/app/classes
- /portal/app/progress
- /portal/app/events
- /portal/app/certifications
- /portal/app/finance

Backend asociado (ejemplos clave):
- GET /api/student/context
- GET /api/student/classes
- GET /api/student/schedule
- GET /api/student/progress
- GET /api/student/progress/xp-history
- GET /api/student/certifications
- GET /api/student/events
- POST /api/student/events/:id/attendance
- DELETE /api/student/events/:id/attendance
- GET /api/student/events/participations
- GET /api/student/payments
- GET /api/student/payments/:paymentId/receipt
- POST /api/student/enrollments/:id/checkout
- GET /api/student/exports/calendar
- GET /api/student/exports/activity

### 2.3 Capa social y comunidad

Objetivo: activar comunidad con interacciones controladas.

Incluye:
- Perfil propio y edición de perfil.
- Seguidores/seguidos.
- Like en publicaciones.
- Guardados (post y evento).
- Centro de notificaciones.
- Configuración de privacidad granular.
- Exportación de datos personales.
- Búsqueda global (escuelas, eventos, perfiles).

Rutas frontend principales:
- /portal/app/profile
- /portal/app/connections
- /portal/app/saved
- /portal/app/notifications
- /portal/app/search
- /portal/app/preferences

Backend asociado (ejemplos clave):
- GET/PATCH /api/public/portal/profile
- POST/DELETE /api/public/portal/follow/:profileId
- GET /api/public/portal/followers/:profileId
- GET /api/public/portal/following/:profileId
- POST/DELETE /api/public/portal/feed/:id/like
- GET /api/public/portal/feed/liked
- POST/DELETE /api/public/portal/save/:itemType/:itemId
- GET /api/public/portal/saved
- GET /api/public/portal/notifications
- POST /api/public/portal/notifications/:id/read
- GET/PATCH /api/public/portal/privacy
- GET /api/public/portal/export-data
- GET /api/public/portal/search

Nota de seguridad:
- Las rutas de interacción personal (perfil, likes, guardados, notificaciones, privacidad, export-data) requieren usuario autenticado.
- Las rutas de descubrimiento (escuelas, eventos, feed público, métricas) son públicas.

### 2.4 Escuela y profesor (operación y contenido)

Objetivo: habilitar operación social y de contenidos por roles internos.

Incluye escuela:
- Perfil público de escuela (actualización).
- Analytics de escuela.
- Gestión de publicaciones (CRUD).
- Gestión de anuncios.
- Gestión de galería (álbum/fotos).
- Moderación de publicaciones docentes (aprobar/rechazar).

Incluye profesor:
- Consulta de horario.
- Consulta de clases asignadas.
- Consulta de alumnos por clase.
- Creación de publicaciones docentes.

Rutas frontend principales:
- /admin/school/settings
- /admin/school/analytics
- /admin/school/posts
- /admin/school/announcements
- /admin/school/gallery
- /portal/app/teacher/schedule
- /portal/app/teacher/classes
- /portal/app/teacher/posts/new

Backend asociado (ejemplos clave):
- PATCH /api/school/profile
- GET /api/school/analytics
- GET/POST /api/school/posts
- PUT/DELETE /api/school/posts/:id
- GET/POST /api/school/announcements
- GET/POST /api/school/albums
- POST /api/school/photos
- GET /api/school/photos/album/:albumId
- GET /api/teacher/schedule
- GET /api/teacher/classes
- GET /api/teacher/classes/:classId/students
- POST /api/teacher/posts
- POST /api/admin/portal/feed-posts/:id/approve
- POST /api/admin/portal/feed-posts/:id/reject

### 2.5 Eventos y escaleta

Objetivo: cubrir ciclo completo de eventos con sesiones y bloques.

Incluye:
- CRUD de eventos.
- Publicar/despublicar evento con validaciones.
- CRUD de sesiones.
- CRUD de bloques de escaleta.
- Reordenación y recálculo de tiempos.
- Exportación PDF de escaleta.

Cliente frontend principal:
- src/lib/api/events.ts

Servicios backend principales:
- eventService
- eventSessionService
- eventScheduleItemService
- scheduleValidationService
- eventSchedulePdfService

### 2.6 Integraciones y extensiones

Objetivo: habilitar salida de datos y conectividad externa.

Incluye:
- API pública de eventos publicados por escuela.
- Exportación pública de calendario ICS por escuela.
- Endpoint de configuración OAuth (metadatos de issuer/endpoints).
- Exportación calendario del alumno (ICS).
- Exportación actividad del alumno (JSON/CSV).
- Checkout de matrícula y recibos de alumno.
- Emisión de webhooks salientes para eventos relevantes (publicación de evento y matrícula pública) según configuración de entorno.

Backend asociado:
- GET /api/public/integrations/:tenantSlug/events
- GET /api/public/integrations/:tenantSlug/calendar
- GET /api/public/integrations/oauth/config
- GET /api/student/exports/calendar
- GET /api/student/exports/activity
- POST /api/student/enrollments/:id/checkout
- GET /api/student/payments/:paymentId/receipt

## 3) Flujo esperado por rol

### 3.1 Usuario visitante
1. Entra en /portal o /portal/explorer.
2. Consulta escuelas (trending/recomendadas/búsqueda).
3. Revisa métricas y contenido público.
4. Navega a landing de escuela y matrícula pública.
5. Completa formulario de matrícula pública.

### 3.2 Alumno autenticado
1. Accede a /portal/app.
2. Consulta clases, horario, progreso y certificaciones.
3. Gestiona asistencia a eventos.
4. Revisa notificaciones y guardados.
5. En finanzas, consulta pagos y lanza checkout cuando procede.
6. Exporta calendario ICS y actividad JSON/CSV.

### 3.3 Escuela (admin/staff)
1. Ajusta perfil público y branding operativo.
2. Publica posts y anuncios.
3. Carga álbumes y fotos.
4. Monitorea analytics generales y de portal.
5. Modera posts de profesor (approve/reject).

### 3.4 Profesor
1. Consulta horario y clases asignadas.
2. Revisa roster de alumnos por clase.
3. Crea publicación docente con flujo de aprobación.

## 4) Catálogo de funciones disponibles

### 4.1 Funciones backend principales (servicios)

studentPortalService:
- getContext
- getStudentClasses
- getStudentSchedule
- getStudentEnrollments
- getStudentAttendanceStats
- getStudentProgress
- getStudentXpHistory
- getStudentCertifications
- listStudentEvents
- confirmEventAttendance
- cancelEventAttendance
- listEventParticipations
- listStudentPayments
- getStudentReceiptText
- createEnrollmentCheckoutSession
- getStudentCalendarData
- getStudentActivityHistory

portalFoundationService:
- getOrCreateOwnProfile
- upsertOwnProfile
- getPrivacySettings
- updatePrivacySettings
- exportOwnData
- trackAnalyticsEvent
- globalSearch
- getPortalAnalyticsOverview
- listPublicSchools
- searchPublicSchools
- listTrendingSchools
- listRecommendedSchools
- getPublicSchoolBySlug
- getPublicSchoolMetricsBySlug
- comparePublicSchools
- getEcosystemStats
- listPublicFeed
- listPublicEvents
- createFeedPost
- updateFeedPost
- deleteFeedPost
- updateSchoolProfile
- getSchoolAnalytics
- createAnnouncement
- listSchoolAnnouncements
- listSchoolFeedPosts
- listStudentAnnouncements
- createAlbum
- listAlbums
- uploadPhoto
- listPhotosByAlbum
- listTeacherClasses
- listTeacherSchedule
- listTeacherClassStudents
- createTeacherPost
- updateTeacherPostApproval
- followProfile
- likeFeedPost
- unlikeFeedPost
- listLikedPostIds
- unfollowProfile
- listFollowers
- listFollowing
- listNotifications
- markNotificationRead
- saveItem
- unsaveItem
- listSavedItems
- getProfileById
- getTeacherPublicProfile

publicIntegrationsService:
- listPublishedEvents
- exportSchoolCalendarIcs

### 4.2 Funciones frontend API (SDK cliente)

src/lib/api/studentPortal.ts:
- getStudentPortalContext
- getStudentPortalClasses
- getStudentPortalSchedule
- getStudentPortalProgress
- getStudentPortalXpHistory
- getStudentPortalCertifications
- listStudentPortalEvents
- confirmStudentEventAttendance
- cancelStudentEventAttendance
- listStudentEventParticipations
- listStudentPortalPayments
- createStudentEnrollmentCheckout
- downloadStudentReceipt
- downloadStudentCalendarIcs
- downloadStudentActivityExport

src/lib/api/portalFoundation.ts (extracto funcional):
- Perfil/privacidad: getOwnPortalProfile, updateOwnPortalProfile, getPortalPrivacySettings, updatePortalPrivacySettings, exportPortalOwnData
- Escuelas: listPublicPortalSchools, getPublicPortalSchoolBySlug, getPublicPortalSchoolMetrics, listTrendingPortalSchools, listRecommendedPortalSchools, searchPublicPortalSchools, comparePortalSchools
- Comunidad/contenido: listPublicPortalFeed, likePortalPost, unlikePortalPost, listLikedPortalPostIds, followPortalProfile, unfollowPortalProfile, listPortalFollowers, listPortalFollowing
- Guardados/notificaciones: savePortalItem, unsavePortalItem, listSavedPortalItems, listPortalNotifications, markPortalNotificationAsRead
- Eventos/descubrimiento: listPublicPortalEvents, searchPortalGlobal, getPortalEcosystemStats
- Escuela/profesor: updateSchoolPortalProfile, getSchoolPortalAnalytics, getSchoolPortalAnalyticsOverview, listSchoolPortalPosts, createSchoolPortalPost, updateSchoolPortalPost, deleteSchoolPortalPost, approveTeacherPortalPost, rejectTeacherPortalPost, listSchoolAnnouncements, createSchoolAnnouncement, listStudentAnnouncements, listSchoolGalleryAlbums, createSchoolGalleryAlbum, uploadSchoolGalleryPhoto, listPhotosByAlbum, listTeacherClasses, listTeacherSchedule, listTeacherClassStudents, createTeacherPortalPost

src/lib/api/events.ts:
- getEvents, getEvent, createEvent, updateEvent, deleteEvent
- publishEvent, unpublishEvent
- createSession, updateSession, deleteSession
- getScheduleItems, createScheduleItem, updateScheduleItem, deleteScheduleItem
- reorderScheduleItems, recalcScheduleTimes, exportSchedulePdf

## 5) Persistencia y migraciones activas

Migraciones relevantes aplicadas para este alcance:
- 20260323120000_sprint1_events_schema_rls.sql
- 20260323193000_events_add_notes_column.sql
- 20260323200000_events_sprint8_indexes.sql
- 20260324100000_portal_phase0_foundation.sql
- 20260324113000_portal_phase1_saved_items.sql
- 20260324124500_portal_phase2_event_attendance.sql
- 20260324153000_portal_phase4_school_teacher.sql
- 20260324190000_portal_phase6_optimizations.sql

La fase 6 incluye:
- privacy_settings en student_profiles
- tabla portal_analytics_events
- índices de optimización
- RLS para telemetría

## 6) Alcance actual vs. pendiente

Implementado y operativo:
- Flujos principales de alumno, escuela y profesor.
- Descubrimiento y capa social base.
- Pagos/checkout/exportaciones del portal alumno.
- Integraciones públicas de lectura y calendario.

Parcial o con límite actual:
- OAuth: actualmente se expone configuración base (issuer/endpoints), no flujo de integración de terceros completo con gestión de clientes.
- Comentarios en feed: no implementados; interacción actual enfocada en like/guardado.
- Offline: soporte básico con cache local y aviso de estado; sin sincronización diferida avanzada.
- Integración de pagos: orientada a checkout de matrícula; no cubre aún escenarios avanzados de suscripción/cobros complejos en portal.

## 7) Riesgos operativos actuales

- Crecimiento de superficie API sin documentación de producto unificada para soporte comercial.
- Necesidad de estandarizar observabilidad funcional (dashboards/alertas) para los nuevos endpoints.
- Conviene cerrar pruebas e2e por flujo de rol para evitar regresiones en navegación cruzada.

## 8) Recomendación inmediata

1. Congelar este alcance como baseline funcional.
2. Añadir suite e2e por rol (visitante, alumno, profesor, admin escuela).
3. Definir backlog de fase de hardening: OAuth real, comentarios moderados y mejoras de offline sync.

## 9) Revisión crítica añadida (estado auditado)

Fecha de revisión de estos puntos: 2026-03-24

### 9.1 Creación de contenido con media (feed)
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (reforzado)

Evidencia encontrada:
- Endpoints disponibles: POST /api/media/upload, GET /api/media/:id, DELETE /api/media/:id.
- Modelo disponible: media_assets y relación school_feed_post_media.
- Integración frontend activa en creación y lectura de posts (media_items, image_urls, video_url).
- Validación de pipeline en backend para media subida por archivo: control de MIME permitido y tamaño máximo por tipo (imagen/video), con metadata de validación en processing_metadata.

Brecha pendiente:
- La compresión/transcoding asíncrona avanzada (worker dedicado por lotes) sigue fuera de alcance en esta iteración.

### 9.2 Control de visibilidad / privacidad de contenido
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (v1 por audiencia)

Evidencia encontrada:
- Existe control de visibilidad por audiencia en publicaciones de feed con visibility_scope (`public`, `followers`, `school`) y compatibilidad con is_public.
- Existe configuración de privacidad del perfil de alumno (privacy_settings) y endpoint GET/PATCH /api/public/portal/privacy.
- El endpoint del feed público resuelve contexto opcional del usuario autenticado para permitir contenido restringido según audiencia (por ejemplo `followers` para usuario autenticado y `school` para miembros de tenant).

Brecha pendiente:
- Falta extender el mismo modelo de audiencia a otros módulos de contenido (por ejemplo galerías/eventos en todos los caminos) y cerrar métricas por scope.

### 9.3 Gamificación backend explícita
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (motor explícito v1)

Evidencia encontrada:
- Se incorporó modelo explícito de gamificación con tablas dedicadas: gamification_events, achievements_definitions y user_achievements.
- El progreso del alumno y el historial XP se alimentan desde el ledger persistido (no solo cálculo en memoria), con sincronización de eventos de clase/evento/certificación.

Brecha pendiente:
- Pendiente añadir eventos más finos (p. ej. racha diaria, misiones semanales parametrizables) y panel operativo de administración de reglas.

### 9.4 Follow + feed personalizado
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (v1 personalizado por follows)

Evidencia encontrada:
- Endpoint dedicado disponible: GET /api/public/portal/feed/personalized.
- Lógica explícita de personalización en backend combinando follows de escuelas y follows de perfiles para resolver tenant_ids objetivo.
- Modelo de follow de escuelas incorporado con tabla student_school_follows y endpoints POST/DELETE /api/public/portal/follow-school/:tenantId, más listado GET /api/public/portal/followed-schools.
- Integración frontend activa: las pantallas de feed y home autenticadas consumen feed personalizado.

Brecha pendiente:
- Falta enriquecer ranking/relevancia (señales temporales y afinidad) y estrategia de cold-start avanzada.

### 9.5 Gestión de roles en portal (alumno/profesor/escuela)
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (reforzado con contexto explícito)

Evidencia encontrada:
- Resolución de membresías y contexto de tenant/rol en backend (memberships + requireAuth + tenantContext).
- Control de acceso por autenticación/contexto y políticas RLS en migraciones portal.
- Flujos y rutas diferenciadas por tipo de actor (student/teacher/school-admin).
- Endpoint explícito de proyección de contexto disponible: GET /api/public/portal/context (roles efectivos y tenant_ids relevantes).

Brecha pendiente:
- Pendiente un selector de contexto activo multi-tenant más robusto en frontend para escenarios de múltiples membresías simultáneas.

### 9.6 Onboarding del portal
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (v1 con follows iniciales y cierre de embudo)

Evidencia encontrada:
- Existe flujo de onboarding en /portal/onboarding con pasos para perfil, intereses (disciplinas), nivel y recomendaciones de escuelas.
- El onboarding integra selección de escuelas y follow inicial durante la finalización del flujo.
- Emisión explícita de evento onboarding_completed en frontend para analítica de conversión.
- CTA de cierre orientada a entrada directa al portal tras completar follows iniciales.

Brecha pendiente:
- Falta instrumentar cohortes A/B de onboarding y panel operativo de conversión por paso para optimización continua.

### 9.7 Invitación escuela -> alumno
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (v1 con invitación dedicada)

Evidencia encontrada:
- Flujo dedicado disponible para escuela -> alumno con tabla específica school_student_invitations.
- Endpoints operativos: POST/GET /api/admin/portal/student-invitations y POST /api/public/portal/invitations/accept.
- Aceptación de invitación valida código, expiración y correo de cuenta autenticada; al aceptar conecta follow inicial de escuela.

Brecha pendiente:
- Falta complementar envío transaccional de email/whatsapp outbox para invitaciones masivas y panel de reintentos por canal.

### 9.8 Integración eventos <-> portal social
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (v1 media + participantes públicos)

Evidencia encontrada:
- Modelo explícito de media por evento incorporado con tabla event_media y endpoint público GET /api/public/portal/events/:id/media.
- Vista pública de participantes de evento disponible en GET /api/public/portal/events/:id/participants (respetando perfil público).
- Endpoint admin para vincular media al evento: POST /api/admin/portal/events/:id/media.

Brecha pendiente:
- Falta capa de ranking/engagement post-evento por interacción social (comments/shares) y panel dedicado por evento.

### 9.9 Moderación de contenido (riesgo por menores)
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (v1 reportes + workflow moderación)

Evidencia encontrada:
- Se incorporó modelo de reportes con tablas content_reports y content_report_audit_log.
- Endpoint de usuario final disponible: POST /api/public/portal/reports (y GET histórico propio).
- Endpoints admin de moderación disponibles: GET /api/admin/portal/reports y PATCH /api/admin/portal/reports/:id.
- Workflow de auto-ocultado v1: al superar umbral de reportes abiertos en post, se forza rechazo de publicación y se notifica al autor.

Brecha pendiente:
- Falta instrumentar SLA operativo de moderación (tiempo de respuesta, escalado y métricas por severidad) en dashboard.

### 9.10 Estrategia de notificaciones
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (v1 con contrato versionado)

Evidencia encontrada:
- Existe infraestructura de notificaciones (tabla user_notifications + endpoints de listado/marcado leído).
- Se añadió contrato versionado de notificaciones con taxonomía explícita y tipos objetivo en endpoint dedicado: GET /api/public/portal/notifications/contracts.
- Se instrumentaron los casos objetivo con tipos versionados: evento cercano (event_upcoming_24h_v1), logro desbloqueado (achievement_unlocked_v1) y nuevo post de escuela (school_post_published_v1).
- Todas las emisiones nuevas incorporan metadata con contractVersion y notificationType para trazabilidad de evolución.

Brecha pendiente:
- Falta añadir preferencias granulares por tipo de notificación (opt-in/opt-out por evento) y canal (push/email) en settings de usuario.

### 9.11 Conexión funcional con pricing y planes
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (v1 con matriz canónica)

Evidencia encontrada:
- Existe sistema de entitlements por plan y bloqueo de funciones en frontend admin (useBillingEntitlements, FeatureLockDialog, flujo upgrade).
- Existe catálogo comercial y checkout de upgrade integrado.
- Se publicó matriz canónica feature -> plan para capacidades de portal alumno/eventos/social/escuela en endpoint: GET /api/public/portal/pricing/feature-matrix.
- Se documentó contrato operativo para producto/comercial: docs/portal-pricing-feature-matrix.md.

Brecha pendiente:
- Falta incorporar el mismo contrato como fuente directa en UI comercial pública para comparación en tiempo real.

### 9.12 Métricas clave de producto (definición)
Estado de revisión: REVISADO
Estado funcional: IMPLEMENTADO (v1 con contrato KPI oficial)

Evidencia encontrada:
- Existen eventos de telemetría (portal_analytics_events) y overview con bloques engagement/funnel/adoption/retention.
- Existen pantallas de analítica de escuela para conversion/engagement/funnel.
- Se definió contrato cerrado de KPIs con fórmula, fuente, frecuencia, owner y target en endpoint: GET /api/school/portal/analytics/kpis.
- Se publicó documento de gobierno KPI: docs/portal-kpi-contract.md.
- El dashboard de analítica de escuela incorpora visualización de definiciones KPI (contrato operativo).

Brecha pendiente:
- Falta automatizar verificación de consistencia KPI (tests de contrato) en CI para evitar drift entre backend y documentación.

## 10) Criterios de cierre de la revisión crítica

Para considerar esta revisión crítica "cerrada" en términos de gobernanza funcional, deben cumplirse estos mínimos:

1. Publicar matriz de estado por punto (IMPLEMENTADO/PARCIAL/PENDIENTE) y responsable por brecha.
2. Definir especificación técnica mínima para los pendientes de mayor riesgo:
	- invitación escuela -> alumno,
	- feed personalizado por follows,
	- reporte/moderación de contenido.
3. Publicar matriz de pricing por feature de portal y validarla con producto/comercial.
4. Publicar definición oficial de KPIs (nombre, fórmula, fuente, frecuencia, owner).
5. Convertir cada brecha en ticket de backlog con prioridad y sprint objetivo.