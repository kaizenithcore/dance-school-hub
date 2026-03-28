begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_exam_audit_action') then
    create type app_exam_audit_action as enum ('evaluation_edited', 'grade_modified', 'certificate_generated');
  end if;
end $$;

create table if not exists exam_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references exam_organizations(id) on delete cascade,
  school_id uuid references tenants(id) on delete cascade,
  exam_session_id uuid references exam_sessions(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action app_exam_audit_action not null,
  entity_type text not null,
  entity_id uuid,
  previous_data jsonb not null default '{}'::jsonb,
  new_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (organization_id is not null or school_id is not null),
  check (jsonb_typeof(previous_data) = 'object'),
  check (jsonb_typeof(new_data) = 'object'),
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists exam_audit_events_scope_created_idx
  on exam_audit_events(organization_id, school_id, created_at desc);

create index if not exists exam_audit_events_session_created_idx
  on exam_audit_events(exam_session_id, created_at desc);

create index if not exists exam_audit_events_action_created_idx
  on exam_audit_events(action, created_at desc);

alter table exam_audit_events enable row level security;

drop policy if exists exam_audit_events_select_scope on exam_audit_events;
create policy exam_audit_events_select_scope
on exam_audit_events for select
using (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_audit_events.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_audit_events.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
    )
  )
);

drop policy if exists exam_audit_events_write_scope on exam_audit_events;
create policy exam_audit_events_write_scope
on exam_audit_events for all
using (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_audit_events.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin', 'manager')
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_audit_events.school_id
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
      where om.organization_id = exam_audit_events.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin', 'manager')
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_audit_events.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
);

commit;