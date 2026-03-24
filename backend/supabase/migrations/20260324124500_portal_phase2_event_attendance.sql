begin;

create table if not exists student_event_attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  confirmed_at timestamptz null,
  cancelled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, student_id, event_id)
);

create index if not exists idx_student_event_attendance_student
  on student_event_attendance(tenant_id, student_id, status, created_at desc);

create index if not exists idx_student_event_attendance_event
  on student_event_attendance(tenant_id, event_id, status);

drop trigger if exists set_updated_at_student_event_attendance on student_event_attendance;
create trigger set_updated_at_student_event_attendance
before update on student_event_attendance
for each row execute function app.set_updated_at();

alter table student_event_attendance enable row level security;

create policy if not exists student_event_attendance_select_member
on student_event_attendance
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists student_event_attendance_insert_member
on student_event_attendance
for insert
with check (app.is_tenant_member(tenant_id));

create policy if not exists student_event_attendance_update_member
on student_event_attendance
for update
using (app.is_tenant_member(tenant_id))
with check (app.is_tenant_member(tenant_id));

commit;
