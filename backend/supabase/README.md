# Supabase Assets

This folder contains database artifacts for the backend.

## Migrations

- `migrations/20260307130000_sprint1_core_schema.sql`

Apply this migration to your Supabase project before starting Sprint 2 features.

## Notes

- The migration creates a multi-tenant schema with `tenant_id` isolation.
- RLS policies are based on `tenant_memberships` and `auth.uid()`.
- Service role operations continue to work from backend admin clients.
