Backend Technical Plan (Copilot)
Compatible With Existing Frontend (React + Vite)
Stack

Backend:

Next.js 14 (API routes only)

Supabase (PostgreSQL + Auth + Storage)

Stripe

Resend

Zod

TypeScript

Frontend (existing):

React

Vite

React Router

Zustand / local state

Mock API layer (src/lib/api/*)

Architecture Overview

Frontend and backend will remain separate applications.

frontend/
  React + Vite
  src/
    pages
    components
    hooks
    lib/api

backend/
  Next.js API
  app/api
  lib/services
  lib/db
  lib/auth
  lib/validators
  types

Communication:

Frontend → REST API → Next backend → Supabase

The frontend continues using src/lib/api/* which becomes a real API client instead of mock data.

Important:

Because frontend and backend are separate apps, API calls must use a backend base URL (VITE_API_URL) and not same-origin /api paths.

Core Integration Principle

Backend must respect the existing frontend contracts.

Example:

src/lib/api/classes.ts

Already defines:

getClasses()
createClass()
updateClass()
deleteClass()

Backend must implement matching endpoints.

Phase 0 — Backend Foundation
Sprint 0 (2–3 days)
Goals

Create backend infrastructure without touching frontend.

Step 1 — Create backend project
backend/

Initialize

npx create-next-app backend

Configuration

App Router
TypeScript
ESLint
No frontend pages
Step 2 — Install dependencies
npm install @supabase/supabase-js
npm install stripe
npm install zod
npm install uuid
npm install resend
Step 3 — Backend structure
backend/
  app/api
  lib

  lib/db
    supabaseClient.ts
    supabaseAdmin.ts

  lib/services
    tenantService.ts
    classService.ts
    scheduleService.ts
    enrollmentService.ts
    paymentService.ts

  lib/auth
    requireAuth.ts
    tenantContext.ts

  lib/validators
    classSchemas.ts
    enrollmentSchemas.ts

  types
    domain.ts
Step 4 — Supabase clients

User client

lib/db/supabaseClient.ts

Admin client

lib/db/supabaseAdmin.ts

Used for:

cron

webhooks

service tasks

Step 5 — Global API response format

All endpoints return:

{
 success: true,
 data: {}
}

Errors

{
 success:false,
 error:{
  code,
  message
 }
}
Verification

backend runs locally

Supabase connection works

/api/health endpoint returns OK

Phase 1 — Database Schema
Sprint 1 (4–5 days)
Goals

Create schema aligned with frontend features.

Core Tables
Tenants
tenants
id
name
slug
created_at
User profiles
user_profiles
id
email
display_name
created_at
Tenant memberships
tenant_memberships
id
tenant_id
user_id
role
created_at
School Settings
school_settings

Stores configuration used by:

SettingsPage

Enrollment form

Public landing

Fields

tenant_id
branding
enrollment_config
payment_config
schedule_config
Teachers
teachers
id
tenant_id
name
email
phone
bio
Rooms
rooms
id
tenant_id
name
capacity
Classes
classes
id
tenant_id
name
discipline
teacher_id
price
capacity
description
Class schedules

Important for drag-and-drop schedule editor.

class_schedules

Fields

id
tenant_id
class_id
room_id
weekday
start_time
end_time
Students
students
id
tenant_id
name
email
phone
date_of_birth
Guardians
guardians
id
tenant_id
name
email
phone
Enrollments
enrollments
id
tenant_id
student_id
class_id
status
payment_status
created_at
Attachments
enrollment_attachments
id
tenant_id
enrollment_id
file_url
Payments
payments
id
tenant_id
enrollment_id
amount
status
provider
Payment events
payment_events

Used for Stripe webhook idempotency.

Audit log
audit_log

Tracks admin actions.

Row Level Security

Each tenant-scoped table enforces tenant access via membership, not direct trust on custom JWT fields.

Recommended policy model:

tenant_id IN (
  SELECT tenant_id
  FROM tenant_memberships
  WHERE user_id = auth.uid()
)

This avoids coupling security to custom token claims and supports multi-tenant users safely.
Verification

migrations run

tenant isolation tested

Phase 2 — Tenant System
Sprint 2 (3–4 days)
Goals

Support multi-tenant school accounts.

Endpoint
POST /api/tenants

Creates

tenant

admin user

tenant_membership (role=owner)

settings

Auth

Use Supabase Auth.

Login handled by frontend.

Backend reads session token.

Middleware
requireAuth()

Extracts

user_id
tenant_id
role

Optional helper endpoint

GET /api/auth/me

Returns effective tenant context for frontend bootstrap.
Verification

tenant created

admin login works

Phase 3 — School Configuration
Sprint 3 (4–5 days)

Integrates with:

SettingsPage
ClassesPage
Teachers API
GET /api/admin/teachers
POST /api/admin/teachers
PUT /api/admin/teachers/:id
DELETE /api/admin/teachers/:id
Rooms API
GET /api/admin/rooms
POST /api/admin/rooms
Classes API

Must match

src/lib/api/classes.ts

Endpoints

GET /api/admin/classes
POST /api/admin/classes
PUT /api/admin/classes/:id
DELETE /api/admin/classes/:id
Verification

Admin pages integrate with API client with minimal UI changes and replacement of local mock mutations.

Phase 4 — Schedule System
Sprint 4 (5–6 days)

Integrates with

ScheduleEditor
useScheduleEditor
Endpoint
POST /api/admin/schedule/save

Receives batch update

Example payload

{
 schedules:[
  {
   class_id,
   room_id,
   weekday,
   start_time,
   end_time
  }
 ]
}
Validation

Backend checks

room conflict
teacher conflict
Query
GET /api/public/schedule/:tenantSlug

Used by

FullSchedulePage
Verification

Drag-and-drop editor persists schedules.

Phase 5 — Public Enrollment
Sprint 5 (4–5 days)

Integrates with

EnrollPage
EnrollmentForm
Public form schema
GET /api/public/form/:tenantSlug
Enrollment creation
POST /api/public/enroll

Steps

1 validate form
2 create student
3 create enrollment
4 upload attachments
5 send email

File storage

Supabase Storage

Bucket

enrollment-files

Private.

Access via signed URL.

Verification

Public signup works end-to-end.

Phase 6 — Admin Enrollment Management
Sprint 6 (4–5 days)

Used by

EnrollmentsPage
StudentsPage
List enrollments
GET /api/admin/enrollments

Filters

status
class
date
Confirm enrollment
POST /api/admin/enrollments/:id/confirm

Transaction:

BEGIN
check capacity
update enrollment
COMMIT
Decline enrollment
POST /api/admin/enrollments/:id/decline
Verification

Capacity rules respected.

Phase 7 — Payments
Sprint 7 (4–5 days)

Integrates with

PaymentsPage
Stripe checkout
POST /api/payments/checkout
Webhook
POST /api/webhooks/stripe

Stores

payment_events

Prevents duplicate processing.

Manual payments
POST /api/admin/payments/manual
Verification

Payment recorded correctly.

Phase 8 — Analytics & Automations
Sprint 8 (4–5 days)

Dashboard currently uses mock data.

Replace with

GET /api/admin/dashboard

Returns

students
enrollments
revenue
occupancy
Automations

Basic jobs:

payment reminders

waitlist promotion

Cron implemented in backend server.

Note:

For production, prefer scheduled jobs via Supabase Edge Functions or an external scheduler instead of relying on always-on Node server runtime.

Phase 9 — Production Hardening
Sprint 9 (3–4 days)

Add

Rate limiting
Upstash Redis
Logging

Structured logs

tenant_id
endpoint
duration
Security

Audit

RLS

Storage

API validation

Minimal Frontend Changes Required

Small but real integration changes are expected.

1 — Replace mock APIs
src/lib/api/*

Change

mock data

to

fetch(`${VITE_API_URL}/api/...`) 
2 — Add auth token header
Authorization: Bearer <supabase session>
3 — Environment config
VITE_API_URL
4 — Replace local state write paths in admin pages

Current pages like Students, Classes, Enrollments, Payments and Schedule use in-memory mutations and must call services + invalidate/refetch data.
5 — Align public enrollment and schedule screens with backend payloads

Enroll and schedule pages currently boot from mock constants and must load tenant data by slug.
Final Architecture
Frontend (React + Vite)
       ↓
   API Client
       ↓
Next.js Backend
       ↓
Supabase