-- Sprint 5: Persist configurable enrollment form per tenant

begin;

create table if not exists enrollment_form_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  config jsonb not null,
  is_published boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create index if not exists idx_enrollment_form_configs_tenant on enrollment_form_configs(tenant_id);

alter table enrollment_form_configs enable row level security;

create policy "Enable read access for tenant members on enrollment form configs" on enrollment_form_configs
  for select
  using (
    tenant_id in (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.user_id = auth.uid() and tm.is_active = true
    )
  );

create policy "Enable upsert for admin/owner members on enrollment form configs" on enrollment_form_configs
  for insert
  with check (
    tenant_id in (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.user_id = auth.uid() and tm.is_active = true and tm.role in ('owner', 'admin')
    )
  );

create policy "Enable update for admin/owner members on enrollment form configs" on enrollment_form_configs
  for update
  using (
    tenant_id in (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.user_id = auth.uid() and tm.is_active = true and tm.role in ('owner', 'admin')
    )
  );

drop trigger if exists set_updated_at_enrollment_form_configs on enrollment_form_configs;
create trigger set_updated_at_enrollment_form_configs
before update on enrollment_form_configs
for each row execute function app.set_updated_at();

commit;
