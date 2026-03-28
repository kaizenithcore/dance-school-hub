begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_exam_membership_role') then
    create type app_exam_membership_role as enum ('admin', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_exam_session_status') then
    create type app_exam_session_status as enum ('draft', 'open', 'closed', 'completed');
  end if;
end $$;

create table if not exists exam_organizations (
  id uuid primary key references organizations(id) on delete cascade,
  name text not null,
  slug text not null unique,
  contact_email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exam_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references exam_organizations(id) on delete cascade,
  school_id uuid not null references tenants(id) on delete cascade,
  role app_exam_membership_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, school_id)
);

create table if not exists exam_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references exam_organizations(id) on delete cascade,
  school_id uuid references tenants(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  enrollment_start date,
  enrollment_end date,
  status app_exam_session_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((organization_id is null) <> (school_id is null)),
  check (end_date >= start_date),
  check (enrollment_start is null or enrollment_end is null or enrollment_end >= enrollment_start)
);

create index if not exists exam_organizations_slug_idx on exam_organizations(slug);
create index if not exists exam_organizations_active_idx on exam_organizations(active);
create index if not exists exam_memberships_school_idx on exam_memberships(school_id);
create index if not exists exam_memberships_org_idx on exam_memberships(organization_id);
create index if not exists exam_sessions_org_idx on exam_sessions(organization_id);
create index if not exists exam_sessions_school_idx on exam_sessions(school_id);
create index if not exists exam_sessions_status_idx on exam_sessions(status);
create index if not exists exam_sessions_start_date_idx on exam_sessions(start_date);

create or replace function app.sync_exam_organization_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_org organizations%rowtype;
begin
  select * into source_org from organizations where id = new.id;

  if source_org.id is null then
    raise exception 'Organization % does not exist', new.id;
  end if;

  if source_org.kind <> 'association' then
    raise exception 'Exam organizations must reference association kind organizations';
  end if;

  new.name := source_org.name;
  new.slug := source_org.slug;
  new.updated_at := now();

  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_exam_organizations_updated_at') then
    create trigger set_exam_organizations_updated_at
      before update on exam_organizations
      for each row
      execute function app.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_exam_memberships_updated_at') then
    create trigger set_exam_memberships_updated_at
      before update on exam_memberships
      for each row
      execute function app.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_exam_sessions_updated_at') then
    create trigger set_exam_sessions_updated_at
      before update on exam_sessions
      for each row
      execute function app.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'sync_exam_organizations_from_organizations') then
    create trigger sync_exam_organizations_from_organizations
      before insert or update of id on exam_organizations
      for each row
      execute function app.sync_exam_organization_identity();
  end if;
end $$;

alter table exam_organizations enable row level security;
alter table exam_memberships enable row level security;
alter table exam_sessions enable row level security;

create policy if not exists exam_organizations_select_scope
on exam_organizations for select
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_organizations.id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
  or exists (
    select 1
    from exam_memberships em
    join tenant_memberships tm on tm.tenant_id = em.school_id
    where em.organization_id = exam_organizations.id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
);

create policy if not exists exam_organizations_write_admin
on exam_organizations for all
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_organizations.id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_organizations.id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin')
  )
);

create policy if not exists exam_memberships_select_scope
on exam_memberships for select
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_memberships.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
  or exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = exam_memberships.school_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
);

create policy if not exists exam_memberships_write_org_admin
on exam_memberships for all
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_memberships.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_memberships.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin')
  )
);

create policy if not exists exam_sessions_select_scope
on exam_sessions for select
using (
  (exam_sessions.organization_id is not null and exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_sessions.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  ))
  or (exam_sessions.organization_id is not null and exists (
    select 1
    from exam_memberships em
    join tenant_memberships tm on tm.tenant_id = em.school_id
    where em.organization_id = exam_sessions.organization_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  ))
  or (exam_sessions.school_id is not null and exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = exam_sessions.school_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  ))
);

create policy if not exists exam_sessions_insert_scope
on exam_sessions for insert
with check (
  (
    exam_sessions.organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_sessions.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin', 'manager')
    )
  )
  or (
    exam_sessions.school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_sessions.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
);

create policy if not exists exam_sessions_update_scope
on exam_sessions for update
using (
  (
    exam_sessions.organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_sessions.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin', 'manager')
    )
  )
  or (
    exam_sessions.school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_sessions.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
)
with check (
  (
    exam_sessions.organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_sessions.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin', 'manager')
    )
  )
  or (
    exam_sessions.school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_sessions.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
);

create policy if not exists exam_sessions_delete_scope
on exam_sessions for delete
using (
  (
    exam_sessions.organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_sessions.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin')
    )
  )
  or (
    exam_sessions.school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_sessions.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
);

commit;
