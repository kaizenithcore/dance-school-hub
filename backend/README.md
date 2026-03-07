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
