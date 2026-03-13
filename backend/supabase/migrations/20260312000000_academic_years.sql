-- Sprint 6: Academic years management system

begin;

-- Create academic_years table
create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  year_code text not null,
  display_name text not null,
  start_date date not null,
  end_date date not null,
  data_retention_months integer not null default 36 check (data_retention_months > 0),
  is_active boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, year_code),
  check (start_date < end_date)
);

create index if not exists idx_academic_years_tenant on academic_years(tenant_id);
create index if not exists idx_academic_years_active on academic_years(tenant_id, is_active);
create index if not exists idx_academic_years_archived on academic_years(archived_at);

-- Update school_settings to include current academic year
alter table school_settings 
add column if not exists current_academic_year_id uuid references academic_years(id) on delete set null;

-- Create RLS policies for academic_years
alter table academic_years enable row level security;

create policy if not exists academic_years_select_member
on academic_years
for select
using (
  tenant_id in (
    select tenant_id from tenant_memberships where user_id = auth.uid() and is_active
  )
);

create policy if not exists academic_years_insert_admin
on academic_years
for insert
with check (
  tenant_id in (
    select tenant_id from tenant_memberships where user_id = auth.uid() and is_active and role = 'admin'
  )
);

create policy if not exists academic_years_update_admin
on academic_years
for update
using (
  tenant_id in (
    select tenant_id from tenant_memberships where user_id = auth.uid() and is_active and role = 'admin'
  )
);

create policy if not exists academic_years_delete_admin
on academic_years
for delete
using (
  tenant_id in (
    select tenant_id from tenant_memberships where user_id = auth.uid() and is_active and role = 'admin'
  )
);

-- Create trigger for academic_years updated_at
drop trigger if exists set_updated_at_academic_years on academic_years;
create trigger set_updated_at_academic_years
before update on academic_years
for each row execute function app.set_updated_at();

-- Seed initial academic year for existing tenants (current year 2025-2026)
insert into academic_years (tenant_id, year_code, display_name, start_date, end_date, is_active)
select id, '2025-2026', 'Curso 2025-2026', '2025-09-01'::date, '2026-08-31'::date, true
from tenants
where not exists (select 1 from academic_years where tenant_id = tenants.id);

-- Update school_settings to reference the new academic year
update school_settings
set current_academic_year_id = (
  select id from academic_years 
  where academic_years.tenant_id = school_settings.tenant_id 
  and is_active = true
  order by created_at desc
  limit 1
)
where current_academic_year_id is null
and tenant_id in (select tenant_id from academic_years);

commit;
