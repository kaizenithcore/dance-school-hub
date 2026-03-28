🧠 CONTEXTO PARA COPILOT (INCLUIR SIEMPRE)
Estamos implementando el backend del módulo ExamSuit dentro de DanceHub.

El sistema actual ya incluye:
- Multi-tenant (escuelas)
- Gestión de alumnos, clases, pagos
- Portal alumno
- Sistema de eventos
- Sistema de formularios dinámicos
- Sistema de facturación por planes

ExamSuit es un módulo NUEVO orientado a:
- Asociaciones (multi-escuela)
- Escuelas individuales (lite)

Debe reutilizar:
- students
- enrollments (adaptado)
- form builder
- sistema de PDFs
- sistema de notificaciones
- sistema de planes

IMPORTANTE:
- NO duplicar lógica existente
- Extender modelos actuales cuando sea posible
- Mantener consistencia con RLS y multi-tenant
🧩 FASE 1 — MODELO DE DATOS (CORE EXAMSUIT)
🚀 SPRINT 1 — Entidades base
Crear estructura base para ExamSuit.

TABLAS:

exam_organizations
- id
- name
- slug
- contact_email
- active
- created_at

exam_memberships (relación escuelas ↔ asociación)
- id
- organization_id
- school_id (tenant_id)
- role (admin / member)
- created_at

exam_sessions (convocatorias)
- id
- organization_id (nullable si es escuela individual)
- school_id (nullable)
- title
- description
- start_date
- end_date
- enrollment_start
- enrollment_end
- status (draft / open / closed / completed)
- created_at

Reglas:
- Si organization_id != null → asociación
- Si school_id != null → escuela individual

Aplicar RLS:
- asociaciones ven sus sesiones
- escuelas ven solo sesiones donde participan
🚀 SPRINT 2 — Inscripciones a examen
Crear sistema de inscripción reutilizando lógica existente.

TABLAS:

exam_enrollments
- id
- exam_session_id
- student_id (nullable)
- external_student_name
- external_student_email
- school_id
- status (pending / confirmed / cancelled)
- created_at

exam_enrollment_fields (usar JSONB)
- id
- enrollment_id
- data (jsonb)

IMPORTANTE:
- reutilizar lógica de form builder existente
- permitir alumnos externos si no existen en sistema

ENDPOINTS:
- POST /api/exams/:sessionId/enroll
- GET /api/exams/:sessionId/enrollments
🚀 SPRINT 3 — Evaluación y notas
TABLAS:

exam_evaluations
- id
- exam_session_id
- config (jsonb)
  ejemplo:
  [
    { "name": "Técnica", "weight": 0.5 },
    { "name": "Expresión", "weight": 0.5 }
  ]

exam_results
- id
- enrollment_id
- scores (jsonb)
- final_score
- status (pass / fail / pending)
- evaluated_by
- created_at

LÓGICA:
- calcular nota automáticamente
- permitir override manual

ENDPOINTS:
- POST /api/exams/:sessionId/evaluations
- POST /api/exams/results
- GET /api/exams/results/:sessionId
🚀 SPRINT 4 — Certificados
TABLAS:

exam_certificate_templates
- id
- organization_id
- name
- template_html
- created_at

exam_certificates
- id
- result_id
- generated_pdf_url
- created_at

LÓGICA:
- reutilizar sistema PDF existente
- renderizar HTML + datos dinámicos

ENDPOINTS:
- POST /api/exams/certificates/generate
- GET /api/exams/certificates/:id
🔗 FASE 2 — INTEGRACIÓN CON SISTEMA ACTUAL
🚀 SPRINT 5 — Integración con students
Objetivo:
Conectar exam_enrollments con students existentes.

LÓGICA:
- si student_id existe → usar datos reales
- si no → usar external fields

Añadir helper:
- resolveStudentData(enrollment)

Actualizar:
- portal alumno → incluir certificaciones
- student_certifications (tabla nueva o extender existente)

ENDPOINT:
- GET /api/student/exams
🚀 SPRINT 6 — Portal alumno (lite vs completo)
Actualizar backend para soportar:

- usuarios sin escuela (ExamSuit only)
- usuarios con escuela (Pro)

TABLA:

student_exam_profiles
- id
- user_id
- organization_id
- public_profile_enabled
- created_at

LÓGICA:
- si usuario no tiene school_id → modo lite
- limitar endpoints:

lite:
- ver certificados
- ver resultados

full:
- todo

ENDPOINT:
- GET /api/portal/exams/feed
🚀 SPRINT 7 — Integración con planes y billing
Actualizar sistema de planes:

Añadir:
- plan_type: exam_suit | starter | pro | enterprise

TABLA:

exam_subscriptions
- id
- organization_id
- plan (core / lite)
- billing_cycle (monthly / annual)
- active
- created_at

LÓGICA:
- bloquear features según plan
- middleware:

requireExamPlan(planType)

Integrar con Stripe existente.
🔄 FASE 3 — AUTOMATIZACIÓN Y CONVERSIÓN
🚀 SPRINT 8 — Multi-escuela y acceso
Permitir que escuelas accedan a sesiones.

TABLA:

exam_school_access
- id
- exam_session_id
- school_id
- invited_at

ENDPOINTS:
- POST /api/exams/:id/invite-school
- GET /api/exams/available-for-school

LÓGICA:
- escuelas ven sesiones de su asociación
🚀 SPRINT 9 — Notificaciones
Eventos:

- apertura matrícula
- cierre matrícula
- resultado disponible

Reutilizar sistema existente:

ENDPOINTS:
- triggerExamNotifications()

Tipos:
- email (escuela)
- email alumno (opcional futuro)

🚀 SPRINT 10 — Conversión a Pro
Objetivo: facilitar upgrade.

ENDPOINT:

POST /api/exams/upgrade-to-pro

LÓGICA:
- crear tenant escuela si no existe
- migrar:
  - alumnos
  - historial exámenes
  - certificaciones

RESPUESTA:
- success
- redirect_url
⚡ FASE 4 — OPTIMIZACIÓN Y ESCALADO
🚀 SPRINT 11 — Analytics
TABLA:

exam_analytics
- id
- organization_id
- metric
- value
- date

Métricas:
- nº inscritos
- tasa aprobación
- ingresos estimados

ENDPOINT:
- GET /api/exams/analytics
🚀 SPRINT 12 — Seguridad y RLS
Aplicar políticas:

- asociaciones → todo su scope
- escuelas → solo lo que participan
- alumnos → solo sus resultados

Revisar:
- acceso cruzado
- leaks de datos