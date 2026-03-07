-- Sprint 4: Teachers salary, Disciplines/Categories management, Weekly class frequency

begin;

-- Add salary column to teachers
alter table teachers 
add column if not exists salary numeric(10, 2) default 0 check (salary >= 0);

-- Create disciplines table
create table if not exists disciplines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

-- Create categories table
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

-- Add foreign keys to classes to reference disciplines and categories
alter table classes
drop column if exists discipline,
drop column if exists category;

alter table classes
add column if not exists discipline_id uuid references disciplines(id) on delete set null,
add column if not exists category_id uuid references categories(id) on delete set null;

-- Add weekly frequency to classes (how many times per week the class should occur)
alter table classes
add column if not exists weekly_frequency smallint default 1 check (weekly_frequency >= 1);

-- Create seed data for disciplines and categories (if tenant exists)
insert into disciplines (tenant_id, name, description, is_active)
select 
  t.id, 
  d.name, 
  d.description, 
  true
from tenants t
cross join (values
  ('Ballet', 'Classical ballet training'),
  ('Jazz', 'Jazz dance styles'),
  ('Contemporáneo', 'Contemporary dance'),
  ('Hip Hop', 'Urban dance styles'),
  ('Folklórico', 'Traditional folkloric dances')
) as d(name, description)
where not exists (select 1 from disciplines where tenant_id = t.id)
on conflict do nothing;

insert into categories (tenant_id, name, description, is_active)
select 
  t.id, 
  c.name, 
  c.description, 
  true
from tenants t
cross join (values
  ('Principiantes', 'Beginner level'),
  ('Intermedio', 'Intermediate level'),
  ('Avanzado', 'Advanced level')
) as c(name, description)
where not exists (select 1 from categories where tenant_id = t.id)
on conflict do nothing;

-- Enable RLS on new tables
alter table disciplines enable row level security;
alter table categories enable row level security;

-- Create RLS policies for disciplines
create policy "Enable read access for tenant members" on disciplines
  for select
  using (
    tenant_id in (
      select tm.tenant_id from tenant_memberships tm where tm.user_id = auth.uid()
    )
  );

create policy "Enable insert for admin tenant members" on disciplines
  for insert
  with check (
    tenant_id in (
      select tm.tenant_id from tenant_memberships tm 
      where tm.user_id = auth.uid() and tm.role = 'admin'
    )
  );

create policy "Enable update for admin tenant members" on disciplines
  for update
  using (
    tenant_id in (
      select tm.tenant_id from tenant_memberships tm 
      where tm.user_id = auth.uid() and tm.role = 'admin'
    )
  );

create policy "Enable delete for admin tenant members" on disciplines
  for delete
  using (
    tenant_id in (
      select tm.tenant_id from tenant_memberships tm 
      where tm.user_id = auth.uid() and tm.role = 'admin'
    )
  );

-- Create RLS policies for categories
create policy "Enable read access for tenant members" on categories
  for select
  using (
    tenant_id in (
      select tm.tenant_id from tenant_memberships tm where tm.user_id = auth.uid()
    )
  );

create policy "Enable insert for admin tenant members" on categories
  for insert
  with check (
    tenant_id in (
      select tm.tenant_id from tenant_memberships tm 
      where tm.user_id = auth.uid() and tm.role = 'admin'
    )
  );

create policy "Enable update for admin tenant members" on categories
  for update
  using (
    tenant_id in (
      select tm.tenant_id from tenant_memberships tm 
      where tm.user_id = auth.uid() and tm.role = 'admin'
    )
  );

create policy "Enable delete for admin tenant members" on categories
  for delete
  using (
    tenant_id in (
      select tm.tenant_id from tenant_memberships tm 
      where tm.user_id = auth.uid() and tm.role = 'admin'
    )
  );

-- Create indexes for performance
create index if not exists idx_disciplines_tenant on disciplines(tenant_id);
create index if not exists idx_categories_tenant on categories(tenant_id);
create index if not exists idx_classes_discipline on classes(discipline_id);
create index if not exists idx_classes_category on classes(category_id);

commit;
