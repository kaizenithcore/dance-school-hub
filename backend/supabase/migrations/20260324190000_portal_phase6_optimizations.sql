begin;

-- Phase 6: optimization, privacy and telemetry foundations

alter table if exists student_profiles
  add column if not exists privacy_settings jsonb not null default '{}'::jsonb;

create table if not exists portal_analytics_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  session_id text null,
  category text not null check (category in ('engagement', 'funnel', 'adoption', 'retention')),
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_analytics_events_created_at
  on portal_analytics_events(created_at desc);

create index if not exists idx_portal_analytics_events_event_name
  on portal_analytics_events(event_name, created_at desc);

create index if not exists idx_portal_analytics_events_tenant_user
  on portal_analytics_events(tenant_id, user_id, created_at desc);

create index if not exists idx_school_feed_posts_public_recent
  on school_feed_posts(is_public, published_at desc);

create index if not exists idx_events_status_start_date
  on events(status, start_date asc);

create index if not exists idx_school_public_profiles_name
  on school_public_profiles(name);

create index if not exists idx_school_public_profiles_location
  on school_public_profiles(location);

alter table portal_analytics_events enable row level security;

create policy if not exists portal_analytics_events_insert_authenticated_or_public
on portal_analytics_events
for insert
with check (
  user_id = auth.uid()
  or user_id is null
);

create policy if not exists portal_analytics_events_select_tenant_staff
on portal_analytics_events
for select
using (
  tenant_id is not null
  and app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[])
);

commit;
