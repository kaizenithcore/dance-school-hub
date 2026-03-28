begin;

create table if not exists exam_analytics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references exam_organizations(id) on delete cascade,
  metric text not null,
  value numeric(12,2) not null,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, metric, date),
  check (metric <> '')
);

create index if not exists exam_analytics_org_date_idx
  on exam_analytics(organization_id, date desc);

create index if not exists exam_analytics_metric_date_idx
  on exam_analytics(metric, date desc);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_exam_analytics_updated_at') then
    create trigger set_exam_analytics_updated_at
      before update on exam_analytics
      for each row
      execute function app.set_updated_at();
  end if;
end $$;

alter table exam_analytics enable row level security;

create policy if not exists exam_analytics_select_scope
on exam_analytics for select
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_analytics.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy if not exists exam_analytics_write_scope
on exam_analytics for all
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_analytics.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_analytics.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin', 'manager')
  )
);

commit;
