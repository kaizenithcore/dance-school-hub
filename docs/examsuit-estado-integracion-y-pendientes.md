# Estado actual de integracion ExamSuit

Fecha: 2026-03-28
Repositorio: dance-school-hub (backend Next.js + Supabase)

## 1) Resumen ejecutivo

La integracion backend de ExamSuit esta implementada de Sprint 1 a Sprint 19, con hardening funcional adicional posterior (GAP 10 a GAP 14) aplicado en servicios y endpoints.

Estado tecnico validado:
- Build backend: OK
- Typecheck backend: OK
- Lint backend: existen warnings/errores legacy fuera del alcance directo de ExamSuit

Estado funcional actual:
- RBAC fino implementado (examiner/grader/supervisor/association_admin)
- Ciclo de vida de examen formal implementado (draft -> published -> enrollment_open -> closed -> evaluated -> certified)
- Multi-tenant endurecido (aislamiento por tenant en listado y limites por asociacion)
- Analytics extendido con KPI de negocio (pass rate, participacion, conversion escuela->examen)
- Version Lite explicitada con matriz de features bloqueadas/habilitadas
- Fallback de suscripcion manual sin dependencia obligatoria de Stripe
- Errores controlados de inscripcion (duplicada, fuera de plazo, capacidad llena)

## 2) Estado por sprint

| Sprint | Estado | Evidencia principal |
|---|---|---|
| 1 Core entidades + RLS | Implementado | [backend/supabase/migrations/20260327170000_examsuit_sprint1_core.sql](../backend/supabase/migrations/20260327170000_examsuit_sprint1_core.sql) |
| 2 Enrollments | Implementado | [backend/supabase/migrations/20260327180000_examsuit_sprint2_enrollments.sql](../backend/supabase/migrations/20260327180000_examsuit_sprint2_enrollments.sql), [backend/app/api/exams/[sessionId]/enroll/route.ts](../backend/app/api/exams/[sessionId]/enroll/route.ts) |
| 3 Evaluaciones y resultados | Implementado | [backend/supabase/migrations/20260327190000_examsuit_sprint3_evaluations_results.sql](../backend/supabase/migrations/20260327190000_examsuit_sprint3_evaluations_results.sql), [backend/app/api/exams/results/route.ts](../backend/app/api/exams/results/route.ts) |
| 4 Certificados | Implementado | [backend/supabase/migrations/20260327200000_examsuit_sprint4_certificates.sql](../backend/supabase/migrations/20260327200000_examsuit_sprint4_certificates.sql), [backend/app/api/exams/certificates/generate/route.ts](../backend/app/api/exams/certificates/generate/route.ts) |
| 5 Integracion con students | Implementado | [backend/app/api/student/exams/route.ts](../backend/app/api/student/exams/route.ts), [backend/lib/services/studentPortalService.ts](../backend/lib/services/studentPortalService.ts) |
| 6 Portal alumno lite/full | Implementado | [backend/supabase/migrations/20260327210000_examsuit_sprint6_portal_profiles.sql](../backend/supabase/migrations/20260327210000_examsuit_sprint6_portal_profiles.sql), [backend/app/api/portal/exams/feed/route.ts](../backend/app/api/portal/exams/feed/route.ts) |
| 7 Planes y billing | Implementado | [backend/supabase/migrations/20260327220000_examsuit_sprint7_subscriptions.sql](../backend/supabase/migrations/20260327220000_examsuit_sprint7_subscriptions.sql), [backend/app/api/admin/exam-subscriptions/route.ts](../backend/app/api/admin/exam-subscriptions/route.ts) |
| 8 Multi-escuela acceso | Implementado | [backend/supabase/migrations/20260327230000_examsuit_sprint8_school_access.sql](../backend/supabase/migrations/20260327230000_examsuit_sprint8_school_access.sql), [backend/app/api/exams/[id]/invite-school/route.ts](../backend/app/api/exams/[id]/invite-school/route.ts) |
| 9 Notificaciones | Implementado | [backend/supabase/migrations/20260328020000_examsuit_sprint15_notifications_queue.sql](../backend/supabase/migrations/20260328020000_examsuit_sprint15_notifications_queue.sql), [backend/app/api/exams/notifications/trigger/route.ts](../backend/app/api/exams/notifications/trigger/route.ts) |
| 10 Upgrade a Pro | Implementado | [backend/app/api/exams/upgrade-to-pro/route.ts](../backend/app/api/exams/upgrade-to-pro/route.ts), [backend/lib/services/examUpgradeService.ts](../backend/lib/services/examUpgradeService.ts) |
| 11 Analytics | Implementado y ampliado | [backend/supabase/migrations/20260328000000_examsuit_sprint11_analytics.sql](../backend/supabase/migrations/20260328000000_examsuit_sprint11_analytics.sql), [backend/app/api/exams/analytics/route.ts](../backend/app/api/exams/analytics/route.ts), [backend/lib/services/examAnalyticsService.ts](../backend/lib/services/examAnalyticsService.ts) |
| 12 Seguridad y RLS | Implementado | [backend/supabase/migrations/20260328010000_examsuit_sprint12_security_rls.sql](../backend/supabase/migrations/20260328010000_examsuit_sprint12_security_rls.sql) |
| 16 Certificados async (jobs/queue) | Implementado | [backend/supabase/migrations/20260328030000_examsuit_sprint16_certificate_jobs.sql](../backend/supabase/migrations/20260328030000_examsuit_sprint16_certificate_jobs.sql), [backend/app/api/exams/certificates/jobs/route.ts](../backend/app/api/exams/certificates/jobs/route.ts) |
| 17 Auditoria de eventos | Implementado | [backend/supabase/migrations/20260328040000_examsuit_sprint17_audit_events.sql](../backend/supabase/migrations/20260328040000_examsuit_sprint17_audit_events.sql), [backend/app/api/exams/audit/route.ts](../backend/app/api/exams/audit/route.ts) |
| 18 Roles finos | Implementado | [backend/supabase/migrations/20260328050000_examsuit_sprint18_fine_grained_roles.sql](../backend/supabase/migrations/20260328050000_examsuit_sprint18_fine_grained_roles.sql), [backend/app/api/exams/roles/route.ts](../backend/app/api/exams/roles/route.ts) |
| 19 Lifecycle formal de examen | Implementado | [backend/supabase/migrations/20260328060000_examsuit_sprint19_exam_lifecycle.sql](../backend/supabase/migrations/20260328060000_examsuit_sprint19_exam_lifecycle.sql), [backend/app/api/exams/[id]/lifecycle/route.ts](../backend/app/api/exams/[id]/lifecycle/route.ts) |

## 3) Cambios recientes de hardening (GAP 10-14)

Aplicados en codigo backend (sin nueva migracion dedicada salvo donde se indica):

1. GAP 10 - UX de errores controlados en inscripcion:
   - Codigos estables: duplicate_enrollment, enrollment_out_of_window, enrollment_capacity_full.
   - Evidencia: [backend/lib/services/examEnrollmentService.ts](../backend/lib/services/examEnrollmentService.ts), [backend/app/api/exams/[sessionId]/enroll/route.ts](../backend/app/api/exams/[sessionId]/enroll/route.ts)

2. GAP 11 - Multi-tenant mas robusto:
   - Aislamiento de listado por tenant (solo sesiones propias o invitadas).
   - Limites por asociacion (maxSchoolsPerAssociation) con enforcement en alta de memberships.
   - Evidencia: [backend/lib/services/examCoreService.ts](../backend/lib/services/examCoreService.ts), [backend/lib/services/examSubscriptionService.ts](../backend/lib/services/examSubscriptionService.ts)

3. GAP 12 - Analytics explotado:
   - Nuevos KPI: participation_rate_pct y school_to_exam_conversion_pct.
   - Evidencia: [backend/lib/services/examAnalyticsService.ts](../backend/lib/services/examAnalyticsService.ts)

4. GAP 13 - Lite real:
   - Matriz explicita de features por plan (Lite/Core/Pro) y endpoint de consulta.
   - Evidencia: [backend/lib/services/examSubscriptionService.ts](../backend/lib/services/examSubscriptionService.ts), [backend/app/api/admin/exam-subscriptions/feature-matrix/route.ts](../backend/app/api/admin/exam-subscriptions/feature-matrix/route.ts)

5. GAP 14 - Fallback sin Stripe:
   - Checkout de suscripcion con fallback manual y solicitud pending_review.
   - Evidencia: [backend/app/api/admin/exam-subscriptions/checkout-session/route.ts](../backend/app/api/admin/exam-subscriptions/checkout-session/route.ts), [backend/lib/services/examSubscriptionService.ts](../backend/lib/services/examSubscriptionService.ts)

## 4) Endpoints de ExamSuit disponibles

Endpoints admin/core:
- [backend/app/api/admin/exam-organizations/route.ts](../backend/app/api/admin/exam-organizations/route.ts)
- [backend/app/api/admin/exam-memberships/route.ts](../backend/app/api/admin/exam-memberships/route.ts)
- [backend/app/api/admin/exam-sessions/route.ts](../backend/app/api/admin/exam-sessions/route.ts)
- [backend/app/api/admin/exam-subscriptions/route.ts](../backend/app/api/admin/exam-subscriptions/route.ts)
- [backend/app/api/admin/exam-subscriptions/checkout-session/route.ts](../backend/app/api/admin/exam-subscriptions/checkout-session/route.ts)
- [backend/app/api/admin/exam-subscriptions/feature-matrix/route.ts](../backend/app/api/admin/exam-subscriptions/feature-matrix/route.ts)

Endpoints exams:
- [backend/app/api/exams/[sessionId]/enroll/route.ts](../backend/app/api/exams/[sessionId]/enroll/route.ts)
- [backend/app/api/exams/[sessionId]/enrollments/route.ts](../backend/app/api/exams/[sessionId]/enrollments/route.ts)
- [backend/app/api/exams/[sessionId]/evaluations/route.ts](../backend/app/api/exams/[sessionId]/evaluations/route.ts)
- [backend/app/api/exams/results/route.ts](../backend/app/api/exams/results/route.ts)
- [backend/app/api/exams/results/[sessionId]/route.ts](../backend/app/api/exams/results/[sessionId]/route.ts)
- [backend/app/api/exams/certificates/generate/route.ts](../backend/app/api/exams/certificates/generate/route.ts)
- [backend/app/api/exams/certificates/[id]/route.ts](../backend/app/api/exams/certificates/[id]/route.ts)
- [backend/app/api/exams/certificates/jobs/route.ts](../backend/app/api/exams/certificates/jobs/route.ts)
- [backend/app/api/exams/certificates/jobs/tick/route.ts](../backend/app/api/exams/certificates/jobs/tick/route.ts)
- [backend/app/api/exams/[id]/invite-school/route.ts](../backend/app/api/exams/[id]/invite-school/route.ts)
- [backend/app/api/exams/available-for-school/route.ts](../backend/app/api/exams/available-for-school/route.ts)
- [backend/app/api/exams/notifications/trigger/route.ts](../backend/app/api/exams/notifications/trigger/route.ts)
- [backend/app/api/exams/notifications/status/route.ts](../backend/app/api/exams/notifications/status/route.ts)
- [backend/app/api/exams/audit/route.ts](../backend/app/api/exams/audit/route.ts)
- [backend/app/api/exams/roles/route.ts](../backend/app/api/exams/roles/route.ts)
- [backend/app/api/exams/[id]/lifecycle/route.ts](../backend/app/api/exams/[id]/lifecycle/route.ts)
- [backend/app/api/exams/upgrade-to-pro/route.ts](../backend/app/api/exams/upgrade-to-pro/route.ts)
- [backend/app/api/exams/analytics/route.ts](../backend/app/api/exams/analytics/route.ts)

Endpoints portal/alumno:
- [backend/app/api/portal/exams/feed/route.ts](../backend/app/api/portal/exams/feed/route.ts)
- [backend/app/api/student/exams/route.ts](../backend/app/api/student/exams/route.ts)

## 5) Configuraciones manuales pendientes (importante)

### 5.1 Ejecutar migraciones SQL en Supabase

Pendiente operacional: aplicar migraciones ExamSuit en el entorno objetivo (dev/staging/prod).

Archivos clave a aplicar:
- [backend/supabase/migrations/20260327170000_examsuit_sprint1_core.sql](../backend/supabase/migrations/20260327170000_examsuit_sprint1_core.sql)
- [backend/supabase/migrations/20260327180000_examsuit_sprint2_enrollments.sql](../backend/supabase/migrations/20260327180000_examsuit_sprint2_enrollments.sql)
- [backend/supabase/migrations/20260327190000_examsuit_sprint3_evaluations_results.sql](../backend/supabase/migrations/20260327190000_examsuit_sprint3_evaluations_results.sql)
- [backend/supabase/migrations/20260327200000_examsuit_sprint4_certificates.sql](../backend/supabase/migrations/20260327200000_examsuit_sprint4_certificates.sql)
- [backend/supabase/migrations/20260327210000_examsuit_sprint6_portal_profiles.sql](../backend/supabase/migrations/20260327210000_examsuit_sprint6_portal_profiles.sql)
- [backend/supabase/migrations/20260327220000_examsuit_sprint7_subscriptions.sql](../backend/supabase/migrations/20260327220000_examsuit_sprint7_subscriptions.sql)
- [backend/supabase/migrations/20260327230000_examsuit_sprint8_school_access.sql](../backend/supabase/migrations/20260327230000_examsuit_sprint8_school_access.sql)
- [backend/supabase/migrations/20260328000000_examsuit_sprint11_analytics.sql](../backend/supabase/migrations/20260328000000_examsuit_sprint11_analytics.sql)
- [backend/supabase/migrations/20260328010000_examsuit_sprint12_security_rls.sql](../backend/supabase/migrations/20260328010000_examsuit_sprint12_security_rls.sql)
- [backend/supabase/migrations/20260328020000_examsuit_sprint15_notifications_queue.sql](../backend/supabase/migrations/20260328020000_examsuit_sprint15_notifications_queue.sql)
- [backend/supabase/migrations/20260328030000_examsuit_sprint16_certificate_jobs.sql](../backend/supabase/migrations/20260328030000_examsuit_sprint16_certificate_jobs.sql)
- [backend/supabase/migrations/20260328040000_examsuit_sprint17_audit_events.sql](../backend/supabase/migrations/20260328040000_examsuit_sprint17_audit_events.sql)
- [backend/supabase/migrations/20260328050000_examsuit_sprint18_fine_grained_roles.sql](../backend/supabase/migrations/20260328050000_examsuit_sprint18_fine_grained_roles.sql)
- [backend/supabase/migrations/20260328060000_examsuit_sprint19_exam_lifecycle.sql](../backend/supabase/migrations/20260328060000_examsuit_sprint19_exam_lifecycle.sql)

### 5.2 Variables de entorno backend

Revisar y completar en entorno:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY (solo necesario para checkout Stripe)
- STRIPE_PRICE_EXAM_SUIT_CORE
- STRIPE_PRICE_EXAM_SUIT_CORE_ANNUAL
- STRIPE_PRICE_EXAM_SUIT_LITE
- STRIPE_PRICE_EXAM_SUIT_LITE_ANNUAL
- RESEND_API_KEY (si se usa envio real por email)

Referencia de esquema de env:
- [backend/lib/env.ts](../backend/lib/env.ts)

### 5.3 Billing manual fallback

Estado actual:
- Existe fallback manual en checkout de suscripcion ExamSuit.
- Si Stripe no esta configurado o se solicita manual, se crea request pending_review.

Pendiente operativo:
- Definir procedimiento de backoffice para aprobar/rechazar requests manuales.
- Definir SLA interno de aprobacion para evitar bloqueos comerciales.

Referencia:
- [backend/app/api/admin/exam-subscriptions/checkout-session/route.ts](../backend/app/api/admin/exam-subscriptions/checkout-session/route.ts)

### 5.4 Notificaciones y cola de salida

Pendiente de operacion:
- Definir ejecucion de trigger de notificaciones (manual, job o scheduler)
- Validar que el procesamiento de outbox este activo por tenant

Referencia:
- [backend/lib/services/examNotificationService.ts](../backend/lib/services/examNotificationService.ts)

### 5.5 Certificados PDF

Pendiente de infraestructura:
- Verificar runtime de Playwright/Chromium en despliegue
- Si aplica, definir PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
- Verificar permisos de storage para bucket exam-certificates

Referencia:
- [backend/lib/services/examCertificateService.ts](../backend/lib/services/examCertificateService.ts)

## 6) Riesgos abiertos

- Riesgo operativo: migraciones no aplicadas de forma consistente en todos los entornos.
- Riesgo funcional: faltan smoke tests E2E automatizados para todos los endpoints criticos.
- Riesgo de observabilidad: falta tablero/checklist formal de errores por modulo ExamSuit.
- Riesgo de gobernanza: el flujo manual de billing requiere proceso de backoffice formalizado.

## 7) Proximos pasos recomendados

### Prioridad alta
1. Aplicar migraciones Sprint 1-19 en staging y luego en produccion.
2. Ejecutar smoke tests autenticados sobre endpoints criticos: enroll, results, certificates, invite-school, notifications, roles, lifecycle, analytics.
3. Definir y documentar runbook de aprobacion de solicitudes manuales de billing.

### Prioridad media
1. Definir scheduler para trigger de notificaciones y proceso de outbox.
2. Confirmar politicas RLS con pruebas de acceso cruzado por rol (association y school).
3. Exponer en frontend la matriz de capacidades Lite/Core/Pro y estados de bloqueo.

### Prioridad baja
1. Reducir deuda de lint global para pipeline de calidad en verde.
2. Agregar pruebas automatizadas de integracion para ExamSuit.

## 8) Checklist de cierre de integracion

- [ ] Migraciones aplicadas en staging.
- [ ] Migraciones aplicadas en produccion.
- [ ] Variables env de Supabase/Stripe/Resend configuradas.
- [ ] Fallback manual de billing validado en flujo real.
- [ ] Smoke tests funcionales completados.
- [ ] Pruebas de seguridad RLS por rol completadas.
- [ ] Flujo de notificaciones/outbox validado.
- [ ] Runbook operativo actualizado con este estado.
