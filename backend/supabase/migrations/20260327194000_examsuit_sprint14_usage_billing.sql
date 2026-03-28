begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_exam_usage_event_type') then
    create type app_exam_usage_event_type as enum ('session_created', 'enrollment_created', 'certificate_generated');
  end if;
end $$;

create table if not exists exam_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references exam_organizations(id) on delete cascade,
  school_id uuid references tenants(id) on delete cascade,
  event_type app_exam_usage_event_type not null,
  entity_id uuid not null,
  quantity integer not null default 1,
  unit_price_cents integer not null,
  currency text not null default 'eur',
  occurred_at timestamptz not null default now(),
  checkout_session_id text,
  billed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (quantity > 0),
  check (unit_price_cents >= 0),
  check (jsonb_typeof(metadata) = 'object'),
  unique (event_type, entity_id)
);

create index if not exists exam_usage_events_org_idx
  on exam_usage_events(organization_id, occurred_at desc);

create index if not exists exam_usage_events_school_idx
  on exam_usage_events(school_id, occurred_at desc);

create index if not exists exam_usage_events_unbilled_idx
  on exam_usage_events(organization_id, occurred_at desc)
  where billed_at is null;

alter table exam_usage_events enable row level security;

create policy if not exists exam_usage_events_select_scope
on exam_usage_events for select
using (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_usage_events.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_usage_events.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
    )
  )
);

create policy if not exists exam_usage_events_write_scope
on exam_usage_events for all
using (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_usage_events.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin')
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_usage_events.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
)
with check (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_usage_events.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin')
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_usage_events.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
);

commit;
