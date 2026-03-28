begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_exam_notification_event_type') then
    create type app_exam_notification_event_type as enum ('enrollment_open', 'enrollment_closed', 'result_available');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_exam_notification_delivery_status') then
    create type app_exam_notification_delivery_status as enum ('queued', 'processing', 'sent', 'failed');
  end if;
end $$;

create table if not exists exam_notification_dispatches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references exam_organizations(id) on delete cascade,
  school_id uuid not null references tenants(id) on delete cascade,
  exam_session_id uuid not null references exam_sessions(id) on delete cascade,
  event_type app_exam_notification_event_type not null,
  recipient_email text not null,
  recipient_name text,
  status app_exam_notification_delivery_status not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  last_error text,
  outbox_audit_id uuid references audit_log(id) on delete set null,
  delivery_logs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipient_email <> ''),
  check (attempts >= 0),
  check (max_attempts > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (jsonb_typeof(delivery_logs) = 'array'),
  unique (exam_session_id, event_type, school_id, recipient_email)
);

create index if not exists exam_notification_dispatches_session_idx
  on exam_notification_dispatches(exam_session_id, created_at desc);

create index if not exists exam_notification_dispatches_school_status_idx
  on exam_notification_dispatches(school_id, status, created_at desc);

create index if not exists exam_notification_dispatches_outbox_idx
  on exam_notification_dispatches(outbox_audit_id)
  where outbox_audit_id is not null;

drop trigger if exists set_updated_at_exam_notification_dispatches on exam_notification_dispatches;
create trigger set_updated_at_exam_notification_dispatches
before update on exam_notification_dispatches
for each row execute function app.set_updated_at();

alter table exam_notification_dispatches enable row level security;

drop policy if exists exam_notification_dispatches_select_scope on exam_notification_dispatches;
create policy exam_notification_dispatches_select_scope
on exam_notification_dispatches for select
using (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_notification_dispatches.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_notification_dispatches.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
    )
  )
);

drop policy if exists exam_notification_dispatches_write_scope on exam_notification_dispatches;
create policy exam_notification_dispatches_write_scope
on exam_notification_dispatches for all
using (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_notification_dispatches.organization_id
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
      where tm.tenant_id = exam_notification_dispatches.school_id
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
      where om.organization_id = exam_notification_dispatches.organization_id
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
      where tm.tenant_id = exam_notification_dispatches.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
);

commit;