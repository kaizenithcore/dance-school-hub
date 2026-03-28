begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_exam_result_status') then
    create type app_exam_result_status as enum ('pass', 'fail', 'pending');
  end if;
end $$;

create table if not exists exam_evaluations (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references exam_sessions(id) on delete cascade,
  config jsonb not null default '[]'::jsonb,
  passing_score numeric(5,2) not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_session_id),
  check (jsonb_typeof(config) = 'array'),
  check (passing_score >= 0 and passing_score <= 100)
);

create table if not exists exam_results (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references exam_enrollments(id) on delete cascade,
  scores jsonb not null default '{}'::jsonb,
  final_score numeric(5,2),
  status app_exam_result_status not null default 'pending',
  evaluated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  manual_override boolean not null default false,
  unique (enrollment_id),
  check (jsonb_typeof(scores) = 'object'),
  check (final_score is null or (final_score >= 0 and final_score <= 100))
);

create index if not exists exam_evaluations_session_idx on exam_evaluations(exam_session_id);
create index if not exists exam_results_enrollment_idx on exam_results(enrollment_id);
create index if not exists exam_results_status_idx on exam_results(status);
create index if not exists exam_results_evaluated_by_idx on exam_results(evaluated_by);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_exam_evaluations_updated_at') then
    create trigger set_exam_evaluations_updated_at
      before update on exam_evaluations
      for each row
      execute function app.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_exam_results_updated_at') then
    create trigger set_exam_results_updated_at
      before update on exam_results
      for each row
      execute function app.set_updated_at();
  end if;
end $$;

alter table exam_evaluations enable row level security;
alter table exam_results enable row level security;

create policy if not exists exam_evaluations_select_scope
on exam_evaluations for select
using (
  exists (
    select 1
    from exam_sessions es
    join organization_memberships om on om.organization_id = es.organization_id
    where es.id = exam_evaluations.exam_session_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
  or exists (
    select 1
    from exam_sessions es
    join tenant_memberships tm on tm.tenant_id = es.school_id
    where es.id = exam_evaluations.exam_session_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
  or exists (
    select 1
    from exam_sessions es
    join exam_memberships em on em.organization_id = es.organization_id
    join tenant_memberships tm on tm.tenant_id = em.school_id
    where es.id = exam_evaluations.exam_session_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
);

create policy if not exists exam_evaluations_write_scope
on exam_evaluations for all
using (
  exists (
    select 1
    from exam_sessions es
    join organization_memberships om on om.organization_id = es.organization_id
    where es.id = exam_evaluations.exam_session_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
  or exists (
    select 1
    from exam_sessions es
    join tenant_memberships tm on tm.tenant_id = es.school_id
    where es.id = exam_evaluations.exam_session_id
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
    where es.id = exam_evaluations.exam_session_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
  or exists (
    select 1
    from exam_sessions es
    join tenant_memberships tm on tm.tenant_id = es.school_id
    where es.id = exam_evaluations.exam_session_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  )
);

create policy if not exists exam_results_select_scope
on exam_results for select
using (
  exists (
    select 1
    from exam_enrollments ee
    join exam_sessions es on es.id = ee.exam_session_id
    join organization_memberships om on om.organization_id = es.organization_id
    where ee.id = exam_results.enrollment_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
  or exists (
    select 1
    from exam_enrollments ee
    join tenant_memberships tm on tm.tenant_id = ee.school_id
    where ee.id = exam_results.enrollment_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
);

create policy if not exists exam_results_write_scope
on exam_results for all
using (
  exists (
    select 1
    from exam_enrollments ee
    join exam_sessions es on es.id = ee.exam_session_id
    join organization_memberships om on om.organization_id = es.organization_id
    where ee.id = exam_results.enrollment_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
  or exists (
    select 1
    from exam_enrollments ee
    join tenant_memberships tm on tm.tenant_id = ee.school_id
    where ee.id = exam_results.enrollment_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from exam_enrollments ee
    join exam_sessions es on es.id = ee.exam_session_id
    join organization_memberships om on om.organization_id = es.organization_id
    where ee.id = exam_results.enrollment_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
  or exists (
    select 1
    from exam_enrollments ee
    join tenant_memberships tm on tm.tenant_id = ee.school_id
    where ee.id = exam_results.enrollment_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  )
);

commit;
