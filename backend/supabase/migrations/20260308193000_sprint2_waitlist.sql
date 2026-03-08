-- Sprint 2: Waitlist automation foundation

create table if not exists class_waitlist (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  source_enrollment_id uuid null references enrollments(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'offered', 'enrolled', 'expired', 'cancelled')),
  priority integer not null default 1000,
  requested_at timestamptz not null default now(),
  offered_at timestamptz null,
  expires_at timestamptz null,
  contact_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists waitlist_offers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  waitlist_id uuid not null references class_waitlist(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'sent', 'accepted', 'expired', 'cancelled')),
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_class_waitlist_tenant_class_status
  on class_waitlist(tenant_id, class_id, status, requested_at);

create index if not exists idx_class_waitlist_contact_email
  on class_waitlist(tenant_id, class_id, ((lower(contact_snapshot->>'email'))));

create index if not exists idx_waitlist_offers_tenant_class
  on waitlist_offers(tenant_id, class_id, offered_at desc);

create index if not exists idx_waitlist_offers_status_expires
  on waitlist_offers(status, expires_at);

drop trigger if exists set_updated_at_class_waitlist on class_waitlist;
create trigger set_updated_at_class_waitlist
before update on class_waitlist
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_waitlist_offers on waitlist_offers;
create trigger set_updated_at_waitlist_offers
before update on waitlist_offers
for each row execute function app.set_updated_at();

alter table class_waitlist enable row level security;
alter table waitlist_offers enable row level security;

drop policy if exists class_waitlist_select_member on class_waitlist;
create policy class_waitlist_select_member
on class_waitlist
for select
using (app.is_tenant_member(tenant_id));

drop policy if exists class_waitlist_write_admin on class_waitlist;
create policy class_waitlist_write_admin
on class_waitlist
for all
using (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]));

drop policy if exists waitlist_offers_select_member on waitlist_offers;
create policy waitlist_offers_select_member
on waitlist_offers
for select
using (app.is_tenant_member(tenant_id));

drop policy if exists waitlist_offers_write_admin on waitlist_offers;
create policy waitlist_offers_write_admin
on waitlist_offers
for all
using (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin']::app_tenant_role[]));
