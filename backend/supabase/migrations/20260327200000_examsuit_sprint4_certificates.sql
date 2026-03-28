begin;

create table if not exists exam_certificate_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references exam_organizations(id) on delete cascade,
  name text not null,
  template_html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(name)) >= 2)
);

create table if not exists exam_certificates (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references exam_results(id) on delete cascade,
  template_id uuid references exam_certificate_templates(id) on delete set null,
  generated_pdf_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (generated_pdf_url <> '')
);

create index if not exists exam_certificate_templates_org_idx
  on exam_certificate_templates(organization_id);

create index if not exists exam_certificates_result_idx
  on exam_certificates(result_id);

create index if not exists exam_certificates_template_idx
  on exam_certificates(template_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_exam_certificate_templates_updated_at') then
    create trigger set_exam_certificate_templates_updated_at
      before update on exam_certificate_templates
      for each row
      execute function app.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_exam_certificates_updated_at') then
    create trigger set_exam_certificates_updated_at
      before update on exam_certificates
      for each row
      execute function app.set_updated_at();
  end if;
end $$;

alter table exam_certificate_templates enable row level security;
alter table exam_certificates enable row level security;

create policy if not exists exam_certificate_templates_select_scope
on exam_certificate_templates for select
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_certificate_templates.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy if not exists exam_certificate_templates_write_scope
on exam_certificate_templates for all
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_certificate_templates.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_certificate_templates.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
);

create policy if not exists exam_certificates_select_scope
on exam_certificates for select
using (
  exists (
    select 1
    from exam_results er
    join exam_enrollments ee on ee.id = er.enrollment_id
    join exam_sessions es on es.id = ee.exam_session_id
    join organization_memberships om on om.organization_id = es.organization_id
    where er.id = exam_certificates.result_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
  or exists (
    select 1
    from exam_results er
    join exam_enrollments ee on ee.id = er.enrollment_id
    join tenant_memberships tm on tm.tenant_id = ee.school_id
    where er.id = exam_certificates.result_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
);

create policy if not exists exam_certificates_write_scope
on exam_certificates for all
using (
  exists (
    select 1
    from exam_results er
    join exam_enrollments ee on ee.id = er.enrollment_id
    join exam_sessions es on es.id = ee.exam_session_id
    join organization_memberships om on om.organization_id = es.organization_id
    where er.id = exam_certificates.result_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
  or exists (
    select 1
    from exam_results er
    join exam_enrollments ee on ee.id = er.enrollment_id
    join tenant_memberships tm on tm.tenant_id = ee.school_id
    where er.id = exam_certificates.result_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from exam_results er
    join exam_enrollments ee on ee.id = er.enrollment_id
    join exam_sessions es on es.id = ee.exam_session_id
    join organization_memberships om on om.organization_id = es.organization_id
    where er.id = exam_certificates.result_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
  or exists (
    select 1
    from exam_results er
    join exam_enrollments ee on ee.id = er.enrollment_id
    join tenant_memberships tm on tm.tenant_id = ee.school_id
    where er.id = exam_certificates.result_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  )
);

commit;