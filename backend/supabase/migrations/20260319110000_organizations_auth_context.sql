begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_organization_kind') then
    create type app_organization_kind as enum ('school', 'association');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_organization_role') then
    create type app_organization_role as enum ('owner', 'admin', 'manager', 'member');
  end if;
end $$;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind app_organization_kind not null default 'school',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_tenants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, tenant_id)
);

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_organization_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organizations_kind_idx on organizations(kind);
create index if not exists organization_tenants_tenant_id_idx on organization_tenants(tenant_id);
create index if not exists organization_tenants_org_id_idx on organization_tenants(organization_id);
create index if not exists organization_memberships_user_id_idx on organization_memberships(user_id);
create unique index if not exists organization_tenants_primary_tenant_idx on organization_tenants(tenant_id) where is_primary = true;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_organizations_updated_at'
  ) then
    create trigger set_organizations_updated_at
      before update on organizations
      for each row
      execute function app.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_organization_tenants_updated_at'
  ) then
    create trigger set_organization_tenants_updated_at
      before update on organization_tenants
      for each row
      execute function app.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_organization_memberships_updated_at'
  ) then
    create trigger set_organization_memberships_updated_at
      before update on organization_memberships
      for each row
      execute function app.set_updated_at();
  end if;
end $$;

create or replace function app.map_tenant_role_to_organization_role(source_role app_tenant_role)
returns app_organization_role
language sql
immutable
as $$
  select case source_role
    when 'owner' then 'owner'::app_organization_role
    when 'admin' then 'admin'::app_organization_role
    else 'member'::app_organization_role
  end;
$$;

create or replace function app.ensure_school_organization_for_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into organizations (
    id,
    name,
    slug,
    kind,
    is_active,
    metadata,
    created_at,
    updated_at
  ) values (
    new.id,
    new.name,
    new.slug,
    'school',
    new.is_active,
    jsonb_build_object('source', 'tenant_bootstrap'),
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update
    set name = excluded.name,
        slug = excluded.slug,
        is_active = excluded.is_active,
        updated_at = now();

  insert into organization_tenants (
    organization_id,
    tenant_id,
    is_primary,
    display_order
  ) values (
    new.id,
    new.id,
    true,
    0
  )
  on conflict (organization_id, tenant_id) do update
    set is_primary = excluded.is_primary,
        display_order = excluded.display_order,
        updated_at = now();

  return new;
end;
$$;

create or replace function app.sync_organization_membership_from_tenant_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into organization_memberships (
    organization_id,
    user_id,
    role,
    is_active,
    created_at,
    updated_at
  ) values (
    new.tenant_id,
    new.user_id,
    app.map_tenant_role_to_organization_role(new.role),
    new.is_active,
    new.created_at,
    new.updated_at
  )
  on conflict (organization_id, user_id) do update
    set role = excluded.role,
        is_active = excluded.is_active,
        updated_at = now();

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'bootstrap_school_organization_from_tenant'
  ) then
    create trigger bootstrap_school_organization_from_tenant
      after insert or update of name, slug, is_active on tenants
      for each row
      execute function app.ensure_school_organization_for_tenant();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'sync_org_membership_from_tenant_membership'
  ) then
    create trigger sync_org_membership_from_tenant_membership
      after insert or update of role, is_active on tenant_memberships
      for each row
      execute function app.sync_organization_membership_from_tenant_membership();
  end if;
end $$;

insert into organizations (
  id,
  name,
  slug,
  kind,
  is_active,
  metadata,
  created_at,
  updated_at
)
select
  t.id,
  t.name,
  t.slug,
  'school'::app_organization_kind,
  t.is_active,
  jsonb_build_object('source', 'tenant_backfill'),
  t.created_at,
  t.updated_at
from tenants t
where not exists (
  select 1
  from organizations o
  where o.id = t.id
);

insert into organization_tenants (
  organization_id,
  tenant_id,
  is_primary,
  display_order,
  created_at,
  updated_at
)
select
  t.id,
  t.id,
  true,
  0,
  now(),
  now()
from tenants t
where not exists (
  select 1
  from organization_tenants ot
  where ot.organization_id = t.id
    and ot.tenant_id = t.id
);

insert into organization_memberships (
  organization_id,
  user_id,
  role,
  is_active,
  created_at,
  updated_at
)
select
  tm.tenant_id,
  tm.user_id,
  app.map_tenant_role_to_organization_role(tm.role),
  tm.is_active,
  tm.created_at,
  tm.updated_at
from tenant_memberships tm
on conflict (organization_id, user_id) do update
  set role = excluded.role,
      is_active = excluded.is_active,
      updated_at = now();

commit;