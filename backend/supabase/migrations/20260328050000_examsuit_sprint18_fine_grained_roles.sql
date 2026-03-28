begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_exam_user_role') then
    create type app_exam_user_role as enum ('examiner', 'grader', 'supervisor', 'association_admin');
  end if;
end $$;

create table if not exists exam_user_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references exam_organizations(id) on delete cascade,
  school_id uuid references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_exam_user_role not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object'),
  unique (organization_id, school_id, user_id, role)
);

create index if not exists exam_user_roles_org_idx
  on exam_user_roles(organization_id, role, is_active);

create index if not exists exam_user_roles_school_idx
  on exam_user_roles(school_id, role, is_active);

create index if not exists exam_user_roles_user_idx
  on exam_user_roles(user_id, is_active);

drop trigger if exists set_updated_at_exam_user_roles on exam_user_roles;
create trigger set_updated_at_exam_user_roles
before update on exam_user_roles
for each row execute function app.set_updated_at();

alter table exam_user_roles enable row level security;

drop policy if exists exam_user_roles_select_scope on exam_user_roles;
create policy exam_user_roles_select_scope
on exam_user_roles for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_user_roles.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_user_roles.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
    )
  )
);

drop policy if exists exam_user_roles_write_scope on exam_user_roles;
create policy exam_user_roles_write_scope
on exam_user_roles for all
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_user_roles.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_user_roles.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
);

commit;