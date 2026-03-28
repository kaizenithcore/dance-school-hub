begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_exam_enrollment_status') then
    create type app_exam_enrollment_status as enum ('pending', 'confirmed', 'cancelled');
  end if;
end $$;

create table if not exists exam_enrollments (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references exam_sessions(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  external_student_name text,
  external_student_email text,
  school_id uuid not null references tenants(id) on delete cascade,
  status app_exam_enrollment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (student_id is not null or external_student_name is not null),
  check (
    external_student_email is null
    or external_student_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
);

create table if not exists exam_enrollment_fields (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references exam_enrollments(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id),
  check (jsonb_typeof(data) = 'object')
);

create index if not exists exam_enrollments_session_idx on exam_enrollments(exam_session_id);
create index if not exists exam_enrollments_school_idx on exam_enrollments(school_id);
create index if not exists exam_enrollments_student_idx on exam_enrollments(student_id);
create index if not exists exam_enrollments_status_idx on exam_enrollments(status);

create index if not exists exam_enrollment_fields_enrollment_idx on exam_enrollment_fields(enrollment_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_exam_enrollments_updated_at') then
    create trigger set_exam_enrollments_updated_at
      before update on exam_enrollments
      for each row
      execute function app.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_exam_enrollment_fields_updated_at') then
    create trigger set_exam_enrollment_fields_updated_at
      before update on exam_enrollment_fields
      for each row
      execute function app.set_updated_at();
  end if;
end $$;

alter table exam_enrollments enable row level security;
alter table exam_enrollment_fields enable row level security;

create policy if not exists exam_enrollments_select_scope
on exam_enrollments for select
using (
  exists (
    select 1
    from exam_sessions es
    join organization_memberships om on om.organization_id = es.organization_id
    where es.id = exam_enrollments.exam_session_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
  or exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = exam_enrollments.school_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
);

create policy if not exists exam_enrollments_write_scope
on exam_enrollments for all
using (
  exists (
    select 1
    from exam_sessions es
    join organization_memberships om on om.organization_id = es.organization_id
    where es.id = exam_enrollments.exam_session_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
  or exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = exam_enrollments.school_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from exam_sessions es
    join organization_memberships om on om.organization_id = es.organization_id
    where es.id = exam_enrollments.exam_session_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
  or exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = exam_enrollments.school_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  )
);

create policy if not exists exam_enrollment_fields_select_scope
on exam_enrollment_fields for select
using (
  exists (
    select 1
    from exam_enrollments ee
    where ee.id = exam_enrollment_fields.enrollment_id
      and (
        exists (
          select 1
          from exam_sessions es
          join organization_memberships om on om.organization_id = es.organization_id
          where es.id = ee.exam_session_id
            and om.user_id = auth.uid()
            and om.is_active = true
        )
        or exists (
          select 1
          from tenant_memberships tm
          where tm.tenant_id = ee.school_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
        )
      )
  )
);

create policy if not exists exam_enrollment_fields_write_scope
on exam_enrollment_fields for all
using (
  exists (
    select 1
    from exam_enrollments ee
    where ee.id = exam_enrollment_fields.enrollment_id
      and (
        exists (
          select 1
          from exam_sessions es
          join organization_memberships om on om.organization_id = es.organization_id
          where es.id = ee.exam_session_id
            and om.user_id = auth.uid()
            and om.is_active = true
            and om.role in ('owner', 'admin', 'manager')
        )
        or exists (
          select 1
          from tenant_memberships tm
          where tm.tenant_id = ee.school_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
            and tm.role in ('owner', 'admin')
        )
      )
  )
)
with check (
  exists (
    select 1
    from exam_enrollments ee
    where ee.id = exam_enrollment_fields.enrollment_id
      and (
        exists (
          select 1
          from exam_sessions es
          join organization_memberships om on om.organization_id = es.organization_id
          where es.id = ee.exam_session_id
            and om.user_id = auth.uid()
            and om.is_active = true
            and om.role in ('owner', 'admin', 'manager')
        )
        or exists (
          select 1
          from tenant_memberships tm
          where tm.tenant_id = ee.school_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
            and tm.role in ('owner', 'admin')
        )
      )
  )
);

commit;
