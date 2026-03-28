begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_exam_certificate_job_status') then
    create type app_exam_certificate_job_status as enum ('queued', 'processing', 'completed', 'failed');
  end if;
end $$;

create table if not exists exam_certificate_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references exam_organizations(id) on delete cascade,
  school_id uuid not null references tenants(id) on delete cascade,
  exam_session_id uuid not null references exam_sessions(id) on delete cascade,
  result_id uuid not null references exam_results(id) on delete cascade,
  template_id uuid references exam_certificate_templates(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  status app_exam_certificate_job_status not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  certificate_id uuid references exam_certificates(id) on delete set null,
  generated_pdf_url text,
  processing_logs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (attempts >= 0),
  check (max_attempts > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (jsonb_typeof(processing_logs) = 'array')
);

create index if not exists exam_certificate_jobs_status_next_attempt_idx
  on exam_certificate_generation_jobs(status, next_attempt_at asc);

create index if not exists exam_certificate_jobs_session_idx
  on exam_certificate_generation_jobs(exam_session_id, created_at desc);

create index if not exists exam_certificate_jobs_school_status_idx
  on exam_certificate_generation_jobs(school_id, status, created_at desc);

create unique index if not exists exam_certificate_jobs_unique_active_result_idx
  on exam_certificate_generation_jobs(result_id)
  where status in ('queued', 'processing');

drop trigger if exists set_updated_at_exam_certificate_generation_jobs on exam_certificate_generation_jobs;
create trigger set_updated_at_exam_certificate_generation_jobs
before update on exam_certificate_generation_jobs
for each row execute function app.set_updated_at();

alter table exam_certificate_generation_jobs enable row level security;

drop policy if exists exam_certificate_generation_jobs_select_scope on exam_certificate_generation_jobs;
create policy exam_certificate_generation_jobs_select_scope
on exam_certificate_generation_jobs for select
using (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_certificate_generation_jobs.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_certificate_generation_jobs.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
    )
  )
);

drop policy if exists exam_certificate_generation_jobs_write_scope on exam_certificate_generation_jobs;
create policy exam_certificate_generation_jobs_write_scope
on exam_certificate_generation_jobs for all
using (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_certificate_generation_jobs.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin', 'manager')
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_certificate_generation_jobs.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
)
with check (
  (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = exam_certificate_generation_jobs.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
        and om.role in ('owner', 'admin', 'manager')
    )
  )
  or (
    school_id is not null
    and exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = exam_certificate_generation_jobs.school_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role in ('owner', 'admin')
    )
  )
);

commit;
