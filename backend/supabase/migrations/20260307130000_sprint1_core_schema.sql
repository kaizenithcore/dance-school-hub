-- Sprint 1: Core multi-tenant schema + RLS

begin;

create extension if not exists pgcrypto;

create schema if not exists app;

-- ---------- Enums ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_tenant_role') then
    create type app_tenant_role as enum ('owner', 'admin', 'staff');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_class_status') then
    create type app_class_status as enum ('active', 'inactive', 'draft');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_enrollment_status') then
    create type app_enrollment_status as enum ('pending', 'confirmed', 'declined', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_payment_status') then
    create type app_payment_status as enum ('paid', 'pending', 'overdue', 'refunded');
  end if;
end $$;

-- ---------- Core tables ----------
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_tenant_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists school_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id) on delete cascade,
  branding jsonb not null default '{}'::jsonb,
  enrollment_config jsonb not null default '{}'::jsonb,
  payment_config jsonb not null default '{}'::jsonb,
  schedule_config jsonb not null default '{}'::jsonb,
  notification_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  bio text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  capacity integer not null check (capacity > 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  discipline text not null,
  category text,
  teacher_id uuid references teachers(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  capacity integer not null check (capacity > 0),
  price_cents integer not null check (price_cents >= 0),
  description text,
  status app_class_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists class_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete restrict,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  recurrence jsonb not null default '{"type":"weekly"}'::jsonb,
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text not null,
  date_of_birth date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  payment_type text not null default 'monthly' check (payment_type in ('monthly', 'per_class', 'none')),
  notes text,
  join_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table if not exists guardians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  relation text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  status app_enrollment_status not null default 'pending',
  payment_status app_payment_status not null default 'pending',
  payment_method text,
  student_snapshot jsonb not null default '{}'::jsonb,
  notes text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, student_id, class_id)
);

create table if not exists enrollment_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  file_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  enrollment_id uuid references enrollments(id) on delete set null,
  student_id uuid references students(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null default 'ARS',
  status app_payment_status not null default 'pending',
  provider text not null default 'manual',
  external_reference text,
  paid_at timestamptz,
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  payment_id uuid references payments(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Trigger helpers ----------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- RLS helpers ----------
create or replace function app.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  );
$$;

create or replace function app.has_tenant_role(target_tenant_id uuid, allowed_roles app_tenant_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role = any(allowed_roles)
  );
$$;

-- ---------- Updated_at triggers ----------
drop trigger if exists set_updated_at_tenants on tenants;
create trigger set_updated_at_tenants
before update on tenants
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_user_profiles on user_profiles;
create trigger set_updated_at_user_profiles
before update on user_profiles
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_tenant_memberships on tenant_memberships;
create trigger set_updated_at_tenant_memberships
before update on tenant_memberships
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_school_settings on school_settings;
create trigger set_updated_at_school_settings
before update on school_settings
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_teachers on teachers;
create trigger set_updated_at_teachers
before update on teachers
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_rooms on rooms;
create trigger set_updated_at_rooms
before update on rooms
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_classes on classes;
create trigger set_updated_at_classes
before update on classes
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_class_schedules on class_schedules;
create trigger set_updated_at_class_schedules
before update on class_schedules
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_students on students;
create trigger set_updated_at_students
before update on students
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_guardians on guardians;
create trigger set_updated_at_guardians
before update on guardians
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_enrollments on enrollments;
create trigger set_updated_at_enrollments
before update on enrollments
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_payments on payments;
create trigger set_updated_at_payments
before update on payments
for each row execute function app.set_updated_at();

-- ---------- Indexes ----------
create index if not exists idx_tenant_memberships_tenant_user on tenant_memberships(tenant_id, user_id);
create index if not exists idx_tenant_memberships_user on tenant_memberships(user_id);

create index if not exists idx_teachers_tenant on teachers(tenant_id);
create index if not exists idx_rooms_tenant on rooms(tenant_id);
create index if not exists idx_classes_tenant on classes(tenant_id);
create index if not exists idx_classes_teacher on classes(teacher_id);
create index if not exists idx_classes_status on classes(status);

create index if not exists idx_class_schedules_tenant on class_schedules(tenant_id);
create index if not exists idx_class_schedules_class on class_schedules(class_id);
create index if not exists idx_class_schedules_room_weekday on class_schedules(room_id, weekday);

create index if not exists idx_students_tenant on students(tenant_id);
create index if not exists idx_students_email on students(email);
create index if not exists idx_students_status on students(status);

create index if not exists idx_guardians_tenant on guardians(tenant_id);
create index if not exists idx_guardians_student on guardians(student_id);

create index if not exists idx_enrollments_tenant on enrollments(tenant_id);
create index if not exists idx_enrollments_student on enrollments(student_id);
create index if not exists idx_enrollments_class on enrollments(class_id);
create index if not exists idx_enrollments_status on enrollments(status);

create index if not exists idx_enrollment_attachments_tenant on enrollment_attachments(tenant_id);
create index if not exists idx_enrollment_attachments_enrollment on enrollment_attachments(enrollment_id);

create index if not exists idx_payments_tenant on payments(tenant_id);
create index if not exists idx_payments_enrollment on payments(enrollment_id);
create index if not exists idx_payments_student on payments(student_id);
create index if not exists idx_payments_status_due on payments(status, due_at);

create index if not exists idx_payment_events_tenant on payment_events(tenant_id);
create index if not exists idx_payment_events_payment on payment_events(payment_id);

create index if not exists idx_audit_log_tenant_created on audit_log(tenant_id, created_at desc);

-- ---------- RLS ----------
alter table tenants enable row level security;
alter table user_profiles enable row level security;
alter table tenant_memberships enable row level security;
alter table school_settings enable row level security;
alter table teachers enable row level security;
alter table rooms enable row level security;
alter table classes enable row level security;
alter table class_schedules enable row level security;
alter table students enable row level security;
alter table guardians enable row level security;
alter table enrollments enable row level security;
alter table enrollment_attachments enable row level security;
alter table payments enable row level security;
alter table payment_events enable row level security;
alter table audit_log enable row level security;

-- Profile policies
create policy if not exists user_profiles_select_own
on user_profiles
for select
using (id = auth.uid());

create policy if not exists user_profiles_update_own
on user_profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy if not exists user_profiles_insert_own
on user_profiles
for insert
with check (id = auth.uid());

-- Tenant policies
create policy if not exists tenants_select_member
on tenants
for select
using (app.is_tenant_member(id));

create policy if not exists tenants_update_owner
on tenants
for update
using (app.has_tenant_role(id, array['owner']::app_tenant_role[]))
with check (app.has_tenant_role(id, array['owner']::app_tenant_role[]));

-- Membership policies
create policy if not exists tenant_memberships_select_member
on tenant_memberships
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists tenant_memberships_insert_owner
on tenant_memberships
for insert
with check (app.has_tenant_role(tenant_id, array['owner']::app_tenant_role[]));

create policy if not exists tenant_memberships_update_owner
on tenant_memberships
for update
using (app.has_tenant_role(tenant_id, array['owner']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner']::app_tenant_role[]));

create policy if not exists tenant_memberships_delete_owner
on tenant_memberships
for delete
using (app.has_tenant_role(tenant_id, array['owner']::app_tenant_role[]));

-- Shared tenant-scoped CRUD policies
create policy if not exists school_settings_select_member
on school_settings
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists school_settings_write_admin
on school_settings
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists teachers_select_member
on teachers
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists teachers_write_admin
on teachers
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists rooms_select_member
on rooms
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists rooms_write_admin
on rooms
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists classes_select_member
on classes
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists classes_write_admin
on classes
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists class_schedules_select_member
on class_schedules
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists class_schedules_write_admin
on class_schedules
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists students_select_member
on students
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists students_write_admin
on students
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists guardians_select_member
on guardians
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists guardians_write_admin
on guardians
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists enrollments_select_member
on enrollments
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists enrollments_write_admin
on enrollments
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists enrollment_attachments_select_member
on enrollment_attachments
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists enrollment_attachments_write_admin
on enrollment_attachments
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists payments_select_member
on payments
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists payments_write_admin
on payments
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists payment_events_select_member
on payment_events
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists payment_events_write_admin
on payment_events
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists audit_log_select_member
on audit_log
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists audit_log_insert_admin
on audit_log
for insert
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

commit;
