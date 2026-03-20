# Dance School Hub Backend

Backend API for the Dance School Hub platform.

## Stack

- Next.js App Router (API routes only)
- Supabase (PostgreSQL + Auth + Storage)
- Stripe
- Resend
- Zod
- TypeScript

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Environment

1. Copy `.env.example` to `.env.local`.
2. Set required variables:
	 - `SUPABASE_URL`
	 - `SUPABASE_ANON_KEY`
	 - `SUPABASE_SERVICE_ROLE_KEY`

Optional providers:
	 - `STRIPE_SECRET_KEY` (required to create Stripe checkout sessions)
	 - `STRIPE_PRICE_STARTER`
	 - `STRIPE_PRICE_PRO`
	 - `STRIPE_PRICE_ENTERPRISE`
	 - `STRIPE_PRICE_ADDON_CUSTOM_DOMAIN` (optional)
	 - `STRIPE_PRICE_ADDON_PRIORITY_SUPPORT` (optional)
	 - `STRIPE_PRICE_ADDON_WAITLIST_AUTOMATION` (optional)
	 - `STRIPE_PRICE_BLOCK_STARTER` (optional)
	 - `STRIPE_PRICE_BLOCK_PRO` (optional)
	 - `STRIPE_PRICE_BLOCK_ENTERPRISE` (optional)
	 - `RESEND_API_KEY`

## Healthcheck

Run backend and verify:

```bash
GET /api/health
```

Expected response:

```json
{
	"success": true,
	"data": {
		"status": "ok"
	}
}
```

## Sprint 1 (Schema + RLS)

Migration file:

- `supabase/migrations/20260307130000_sprint1_core_schema.sql`

Contents:

- Core multi-tenant tables
- Constraints and indexes
- RLS helpers and policies based on `tenant_memberships`
- `updated_at` triggers

Apply in Supabase SQL Editor by running the migration SQL file, or with Supabase CLI migrations if configured.

## Public Demo Tenant (Static)

Seed file:

- `supabase/seeds/seed_public_demo_tenant.sql`

Purpose:

- Creates/updates a canonical public demo tenant with slug `escuela-demo-dancehub`.
- Populates static fictional data (teachers, rooms, classes, schedules, students, enrollments).
- Keeps data idempotent so it can be re-run safely.

Notes:

- This seed is intended for conversion/demo flows.
- Data is fictitious and isolated under the demo tenant id.
