begin;

-- Sprint 1: Events module schema + RLS (multi-tenant)

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'event_status'
  ) then
    create type event_status as enum ('draft', 'published');
  end if;
end $$;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date null,
  location text not null,
  description text null,
  ticket_price_cents integer null check (ticket_price_cents is null or ticket_price_cents >= 0),
  capacity integer null check (capacity is null or capacity >= 0),
  status event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table if not exists event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time null,
  name text null,
  notes text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (position >= 0),
  check (end_time is null or end_time >= start_time)
);

create table if not exists event_schedule_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references event_sessions(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  position integer not null default 0,
  start_time time null,
  duration_minutes integer not null check (duration_minutes > 0),
  group_name text not null,
  choreography text null,
  teacher_id uuid null references teachers(id) on delete set null,
  participants_count integer null check (participants_count is null or participants_count >= 0),
  room_id uuid null references rooms(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (position >= 0)
);

create table if not exists event_resources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null check (type in ('room', 'dressing_room')),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_tenant_id
  on events(tenant_id);

create index if not exists idx_event_sessions_event_tenant
  on event_sessions(event_id, tenant_id);

create index if not exists idx_event_schedule_items_session_tenant
  on event_schedule_items(session_id, tenant_id);

drop trigger if exists set_updated_at_events on events;
create trigger set_updated_at_events
before update on events
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_event_sessions on event_sessions;
create trigger set_updated_at_event_sessions
before update on event_sessions
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_event_schedule_items on event_schedule_items;
create trigger set_updated_at_event_schedule_items
before update on event_schedule_items
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_event_resources on event_resources;
create trigger set_updated_at_event_resources
before update on event_resources
for each row execute function app.set_updated_at();

alter table events enable row level security;
alter table event_sessions enable row level security;
alter table event_schedule_items enable row level security;
alter table event_resources enable row level security;

-- RLS by tenant_id coming from JWT claim: auth.jwt() -> tenant_id
-- Supports both root claim and app_metadata fallback.

drop policy if exists events_tenant_isolation on events;
create policy events_tenant_isolation
on events
for all
using (
  tenant_id = coalesce(
    nullif(auth.jwt()->>'tenant_id', '')::uuid,
    nullif(auth.jwt()->'app_metadata'->>'tenant_id', '')::uuid
  )
)
with check (
  tenant_id = coalesce(
    nullif(auth.jwt()->>'tenant_id', '')::uuid,
    nullif(auth.jwt()->'app_metadata'->>'tenant_id', '')::uuid
  )
);

drop policy if exists event_sessions_tenant_isolation on event_sessions;
create policy event_sessions_tenant_isolation
on event_sessions
for all
using (
  tenant_id = coalesce(
    nullif(auth.jwt()->>'tenant_id', '')::uuid,
    nullif(auth.jwt()->'app_metadata'->>'tenant_id', '')::uuid
  )
)
with check (
  tenant_id = coalesce(
    nullif(auth.jwt()->>'tenant_id', '')::uuid,
    nullif(auth.jwt()->'app_metadata'->>'tenant_id', '')::uuid
  )
);

drop policy if exists event_schedule_items_tenant_isolation on event_schedule_items;
create policy event_schedule_items_tenant_isolation
on event_schedule_items
for all
using (
  tenant_id = coalesce(
    nullif(auth.jwt()->>'tenant_id', '')::uuid,
    nullif(auth.jwt()->'app_metadata'->>'tenant_id', '')::uuid
  )
)
with check (
  tenant_id = coalesce(
    nullif(auth.jwt()->>'tenant_id', '')::uuid,
    nullif(auth.jwt()->'app_metadata'->>'tenant_id', '')::uuid
  )
);

drop policy if exists event_resources_tenant_isolation on event_resources;
create policy event_resources_tenant_isolation
on event_resources
for all
using (
  tenant_id = coalesce(
    nullif(auth.jwt()->>'tenant_id', '')::uuid,
    nullif(auth.jwt()->'app_metadata'->>'tenant_id', '')::uuid
  )
)
with check (
  tenant_id = coalesce(
    nullif(auth.jwt()->>'tenant_id', '')::uuid,
    nullif(auth.jwt()->'app_metadata'->>'tenant_id', '')::uuid
  )
);

commit;
