# PLAN BACKEND – EVENTS MODULE
## TL;DR

Se implementa un módulo completo de eventos con:

Eventos → sesiones → escaletas
Validaciones server-side
Integración con clases/profesores/aulas
Multi-tenant con RLS
Endpoints alineados con el frontend
# 🚧 FASE 1 — MODELO DE DATOS + BASE
## 🔹 Sprint 1 — Database Schema + RLS
🎯 Objetivo

Definir estructura completa del módulo en Supabase con multi-tenancy.

### 🧠 PROMPT PARA COPILOT
Implement the full database schema for the Events module in Supabase (PostgreSQL), aligned with an existing multi-tenant architecture using tenant_id and RLS.

The system already has tables: tenants, classes, teachers, rooms.

Create the following tables:

1. events
- id (uuid, pk)
- tenant_id (uuid, fk)
- name (text, required)
- start_date (date, required)
- end_date (date, nullable)
- location (text, required)
- description (text, nullable)
- ticket_price_cents (int, nullable)
- capacity (int, nullable)
- status (enum: draft, published)
- created_at, updated_at

2. event_sessions
- id (uuid, pk)
- event_id (uuid, fk)
- tenant_id (uuid)
- date (date, required)
- start_time (time, required)
- end_time (time, nullable)
- name (text, nullable)
- notes (text, nullable)
- position (int) // ordering
- created_at, updated_at

3. event_schedule_items
- id (uuid, pk)
- session_id (uuid, fk)
- event_id (uuid)
- tenant_id (uuid)
- position (int)
- start_time (time, nullable)
- duration_minutes (int, required)
- group_name (text, required)
- choreography (text, nullable)
- teacher_id (uuid, nullable)
- participants_count (int, nullable)
- room_id (uuid, nullable)
- notes (text, nullable)
- created_at, updated_at

4. event_resources (optional simple structure)
- id (uuid, pk)
- event_id (uuid)
- tenant_id (uuid)
- type (text) // "room", "dressing_room"
- name (text)

Requirements:

- ALL tables must include tenant_id
- Add foreign keys with ON DELETE CASCADE where appropriate
- Add indexes:
  - events (tenant_id)
  - event_sessions (event_id, tenant_id)
  - event_schedule_items (session_id, tenant_id)
- Implement RLS policies:
  - Only allow access where tenant_id matches auth.jwt() tenant_id
- Add updated_at triggers

Do NOT include business logic yet.

✅ Verificación
Migración aplicada correctamente
RLS bloquea acceso entre tenants
Relaciones funcionan

# 🚧 FASE 2 — API BASE (CRUD)
## 🔹 Sprint 2 — Events CRUD API
🎯 Objetivo

Endpoints básicos para eventos alineados con frontend.

### 🧠 PROMPT PARA COPILOT
Implement REST API endpoints for Events module using Next.js App Router (API-only project).

Base route: /api/admin/events

Endpoints:

1. GET /api/admin/events
- Returns all events for tenant
- Include sessions count
- Order by start_date desc

2. POST /api/admin/events
- Validate with zod:
  - name, start_date, location required
- Create event with status='draft'

3. GET /api/admin/events/[id]
- Return event with sessions

4. PUT /api/admin/events/[id]
- Update event fields

5. DELETE /api/admin/events/[id]
- Soft delete or hard delete (choose one consistent with project)

Requirements:

- Extract tenant_id from auth context (existing middleware)
- Use service layer: lib/services/event-service.ts
- Validate input with Zod
- Return consistent response format:
  { data, error }

DO NOT implement sessions or schedule yet.

✅ Verificación
Crear / editar eventos desde frontend
Listado funciona
Tenant isolation OK
## 🔹 Sprint 3 — Sessions API
🎯 Objetivo

Gestionar sesiones de cada evento.

### 🧠 PROMPT PARA COPILOT
Implement session management for events.

Base route: /api/admin/events/[eventId]/sessions

Endpoints:

1. POST /sessions
- Create session
- Required: date, start_time
- Optional: end_time, name

2. PUT /sessions/[id]
- Update session

3. DELETE /sessions/[id]

4. POST /sessions/reorder
- Accept array of session ids with positions

Requirements:

- Ensure session belongs to event and tenant
- Maintain position ordering
- Use transactions for reorder

Service: event-session-service.ts

✅ Verificación
Crear múltiples sesiones
Reordenar sin errores
Persistencia correcta
# 🚧 FASE 3 — ESCALETA (CORE)
## 🔹 Sprint 4 — Schedule Items CRUD
🎯 Objetivo

Implementar bloques de escaleta.

### 🧠 PROMPT PARA COPILOT
Implement schedule items (event_schedule_items).

Base route:
 /api/admin/events/[eventId]/sessions/[sessionId]/schedule

Endpoints:

1. GET /
- Return all items ordered by position

2. POST /
- Create schedule item
- Required:
  - duration_minutes
  - group_name
- Optional:
  - start_time
  - teacher_id
  - room_id

3. PUT /[id]
- Update item

4. DELETE /[id]

5. POST /reorder
- Batch update positions

Requirements:

- Validate teacher_id and room_id belong to tenant
- Ensure session_id and event_id consistency
- Use transactions for reorder

✅ Verificación
CRUD completo de escaleta
Orden persistente
Sin inconsistencias

## 🔹 Sprint 5 — Smart Logic (Auto Time + Validation)
🎯 Objetivo

Añadir lógica útil real.

### 🧠 PROMPT PARA COPILOT
Enhance schedule logic with smart features:

1. Auto time calculation:
- If start_time is null:
  calculate based on previous item:
  previous.start_time + duration

2. Validation rules:
- Prevent negative duration
- Warn if session total duration exceeds threshold (return warning flag)

3. Conflict detection (basic):
- Teacher overlap within same session
- Room overlap within same session

Return structure:
{
  data,
  warnings: []
}

Do NOT block request, only return warnings.

✅ Verificación
Autocalculado correcto
Warnings llegan al frontend
No rompe flujo

# 🚧 FASE 4 — INTEGRACIONES
## 🔹 Sprint 6 — Integración con Clases / Profesores / Aulas
🎯 Objetivo

Conectar datos existentes.

### 🧠 PROMPT PARA COPILOT
Integrate Events module with existing entities:

- classes
- teachers
- rooms

Enhancements:

1. Allow selecting:
- teacher_id
- room_id

2. Add helper endpoint:
GET /api/admin/events/helpers
Returns:
- teachers
- rooms
- classes (optional)

3. Validate:
- teacher_id belongs to tenant
- room_id belongs to tenant

4. Optional:
If class_id is provided:
- autofill group_name
- autofill teacher_id

Keep optional, do not enforce.


✅ Verificación
Selectores funcionan
Datos consistentes

# 🚧 FASE 5 — FINALIZACIÓN
## 🔹 Sprint 7 — Event Status + Publish Flow
🎯 Objetivo

Controlar estado del evento.

### 🧠 PROMPT PARA COPILOT
Implement event status flow:

Field: events.status
- draft
- published

Endpoints:

POST /api/admin/events/[id]/publish
- Validate:
  - At least 1 session
  - Each session has at least 1 schedule item
- If valid → set status=published

POST /api/admin/events/[id]/unpublish
- Set status=draft

Return validation errors if incomplete.

✅ Verificación
No se puede publicar vacío
Flujo claro

## 🔹 Sprint 8 — Performance + Hardening
🎯 Objetivo

Dejar listo para producción.

### 🧠 PROMPT PARA COPILOT
Optimize Events module:

1. Add indexes:
- schedule_items(session_id, position)
- sessions(event_id, position)

2. Add pagination to events list

3. Add logging:
- create/update/delete actions

4. Add audit log entries:
- create_event
- update_event
- create_schedule_item

5. Ensure all endpoints:
- validate tenant context
- handle errors consistently

6. Security:
- verify RLS works on all tables

✅ Verificación
Rendimiento correcto
Logs funcionando
Seguridad OK

# 🧠 RESULTADO FINAL

Tras estos sprints tienes:

Sistema completo de eventos
Escaleta funcional y robusta
Integrado con el resto del sistema
Escalable
Listo para features futuras como:
PDF
Portal alumno
eventos públicos