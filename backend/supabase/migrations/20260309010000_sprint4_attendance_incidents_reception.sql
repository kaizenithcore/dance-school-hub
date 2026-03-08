-- Sprint 4: Attendance sheets and student incidents

begin;

create table if not exists student_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid null references classes(id) on delete set null,
  type text not null check (type in ('absence', 'injury', 'group_change', 'other')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  start_date date not null,
  end_date date null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  resolved_by uuid null references auth.users(id) on delete set null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_incidents_dates_check check (end_date is null or end_date >= start_date)
);

create index if not exists idx_student_incidents_tenant_dates
  on student_incidents(tenant_id, start_date desc, created_at desc);

create index if not exists idx_student_incidents_tenant_student
  on student_incidents(tenant_id, student_id, status);

create index if not exists idx_student_incidents_tenant_class
  on student_incidents(tenant_id, class_id);

drop trigger if exists set_updated_at_student_incidents on student_incidents;
create trigger set_updated_at_student_incidents
before update on student_incidents
for each row execute function app.set_updated_at();

alter table student_incidents enable row level security;

drop policy if exists student_incidents_select_member on student_incidents;
create policy student_incidents_select_member
on student_incidents
for select
using (app.is_tenant_member(tenant_id));

drop policy if exists student_incidents_write_staff on student_incidents;
create policy student_incidents_write_staff
on student_incidents
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

commit;
