begin;

create table if not exists exam_school_access (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references exam_sessions(id) on delete cascade,
  school_id uuid not null references tenants(id) on delete cascade,
  invited_at timestamptz not null default now(),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_session_id, school_id)
);

create index if not exists exam_school_access_session_idx on exam_school_access(exam_session_id);
create index if not exists exam_school_access_school_idx on exam_school_access(school_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_exam_school_access_updated_at') then
    create trigger set_exam_school_access_updated_at
      before update on exam_school_access
      for each row
      execute function app.set_updated_at();
  end if;
end $$;

alter table exam_school_access enable row level security;

create policy if not exists exam_school_access_select_scope
on exam_school_access for select
using (
  exists (
    select 1
    from exam_sessions es
    join organization_memberships om on om.organization_id = es.organization_id
    where es.id = exam_school_access.exam_session_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
  or exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = exam_school_access.school_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
);

create policy if not exists exam_school_access_write_scope
on exam_school_access for all
using (
  exists (
    select 1
    from exam_sessions es
    join organization_memberships om on om.organization_id = es.organization_id
    where es.id = exam_school_access.exam_session_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from exam_sessions es
    join organization_memberships om on om.organization_id = es.organization_id
    where es.id = exam_school_access.exam_session_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
);

commit;