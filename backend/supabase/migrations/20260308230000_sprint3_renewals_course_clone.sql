-- Sprint 3: Renewal campaigns and course clone jobs

begin;

create table if not exists renewal_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  from_period text not null,
  to_period text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'closed', 'cancelled')),
  expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint renewal_campaigns_period_format check (from_period ~ '^\d{4}-\d{2}$' and to_period ~ '^\d{4}-\d{2}$')
);

create index if not exists idx_renewal_campaigns_tenant_created_at
  on renewal_campaigns(tenant_id, created_at desc);

create table if not exists renewal_offers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  campaign_id uuid not null references renewal_campaigns(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  current_class_ids uuid[] not null default '{}'::uuid[],
  proposed_class_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'changed', 'released')),
  expires_at timestamptz null,
  responded_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, student_id)
);

create index if not exists idx_renewal_offers_tenant_campaign_status
  on renewal_offers(tenant_id, campaign_id, status);

create table if not exists clone_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  source_period text not null,
  target_period text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  options_json jsonb not null default '{}'::jsonb,
  summary_json jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clone_jobs_period_format check (source_period ~ '^\d{4}-\d{2}$' and target_period ~ '^\d{4}-\d{2}$')
);

create index if not exists idx_clone_jobs_tenant_created_at
  on clone_jobs(tenant_id, created_at desc);

alter table renewal_campaigns enable row level security;
alter table renewal_offers enable row level security;
alter table clone_jobs enable row level security;

drop policy if exists renewal_campaigns_select_member on renewal_campaigns;
create policy renewal_campaigns_select_member
on renewal_campaigns
for select
using (app.is_tenant_member(tenant_id));

drop policy if exists renewal_campaigns_write_admin on renewal_campaigns;
create policy renewal_campaigns_write_admin
on renewal_campaigns
for all
using (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]));

drop policy if exists renewal_offers_select_member on renewal_offers;
create policy renewal_offers_select_member
on renewal_offers
for select
using (app.is_tenant_member(tenant_id));

drop policy if exists renewal_offers_write_admin on renewal_offers;
create policy renewal_offers_write_admin
on renewal_offers
for all
using (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]));

drop policy if exists clone_jobs_select_member on clone_jobs;
create policy clone_jobs_select_member
on clone_jobs
for select
using (app.is_tenant_member(tenant_id));

drop policy if exists clone_jobs_write_admin on clone_jobs;
create policy clone_jobs_write_admin
on clone_jobs
for all
using (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]));

drop trigger if exists set_updated_at_renewal_campaigns on renewal_campaigns;
create trigger set_updated_at_renewal_campaigns
before update on renewal_campaigns
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_renewal_offers on renewal_offers;
create trigger set_updated_at_renewal_offers
before update on renewal_offers
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_clone_jobs on clone_jobs;
create trigger set_updated_at_clone_jobs
before update on clone_jobs
for each row execute function app.set_updated_at();

commit;
