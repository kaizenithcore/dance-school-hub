-- Sprint 5: Mass communications (campaigns + deliveries)

begin;

create table if not exists message_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp_link')),
  audience_type text not null check (audience_type in ('all', 'class', 'discipline')),
  audience_class_id uuid null references classes(id) on delete set null,
  audience_discipline_id uuid null references disciplines(id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'sent', 'partial', 'failed')),
  recipients_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid null references auth.users(id) on delete set null,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_campaigns_audience_check check (
    (audience_type <> 'class' or audience_class_id is not null)
    and (audience_type <> 'discipline' or audience_discipline_id is not null)
  )
);

create index if not exists idx_message_campaigns_tenant_created_at
  on message_campaigns(tenant_id, created_at desc);

create index if not exists idx_message_campaigns_tenant_status
  on message_campaigns(tenant_id, status, created_at desc);

create table if not exists message_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references message_campaigns(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp_link')),
  recipient_student_id uuid null references students(id) on delete set null,
  recipient_name text not null,
  recipient_email text null,
  recipient_phone text null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'sent', 'failed', 'skipped')),
  provider text null,
  provider_message_id text null,
  error_message text null,
  provider_payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_deliveries_contact_check check (
    (channel = 'email' and recipient_email is not null)
    or (channel = 'whatsapp_link' and recipient_phone is not null)
  )
);

create index if not exists idx_message_deliveries_campaign
  on message_deliveries(campaign_id, created_at asc);

create index if not exists idx_message_deliveries_tenant_status
  on message_deliveries(tenant_id, status, created_at desc);

create index if not exists idx_message_deliveries_tenant_channel
  on message_deliveries(tenant_id, channel, created_at desc);

drop trigger if exists set_updated_at_message_campaigns on message_campaigns;
create trigger set_updated_at_message_campaigns
before update on message_campaigns
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_message_deliveries on message_deliveries;
create trigger set_updated_at_message_deliveries
before update on message_deliveries
for each row execute function app.set_updated_at();

alter table message_campaigns enable row level security;
alter table message_deliveries enable row level security;

drop policy if exists message_campaigns_select_member on message_campaigns;
create policy message_campaigns_select_member
on message_campaigns
for select
using (app.is_tenant_member(tenant_id));

drop policy if exists message_campaigns_write_admin on message_campaigns;
create policy message_campaigns_write_admin
on message_campaigns
for all
using (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]));

drop policy if exists message_deliveries_select_member on message_deliveries;
create policy message_deliveries_select_member
on message_deliveries
for select
using (app.is_tenant_member(tenant_id));

drop policy if exists message_deliveries_write_admin on message_deliveries;
create policy message_deliveries_write_admin
on message_deliveries
for all
using (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]));

commit;
