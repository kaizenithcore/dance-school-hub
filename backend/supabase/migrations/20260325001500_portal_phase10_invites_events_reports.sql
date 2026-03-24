begin;

-- Phase 10: school invitations, event social media, and content reports moderation

create table if not exists school_student_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invited_email text not null,
  invitation_code text not null unique,
  message text null,
  invited_by_user_id uuid null references auth.users(id) on delete set null,
  accepted_by_user_id uuid null references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_school_student_invitations_tenant_status
  on school_student_invitations(tenant_id, status, created_at desc);

create index if not exists idx_school_student_invitations_email
  on school_student_invitations(lower(invited_email));

create unique index if not exists idx_school_student_invitations_pending_email
  on school_student_invitations(tenant_id, lower(invited_email))
  where status = 'pending';

drop trigger if exists set_updated_at_school_student_invitations on school_student_invitations;
create trigger set_updated_at_school_student_invitations
before update on school_student_invitations
for each row execute function app.set_updated_at();

alter table school_student_invitations enable row level security;

create policy if not exists school_student_invitations_select_tenant_staff
on school_student_invitations
for select
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists school_student_invitations_insert_tenant_staff
on school_student_invitations
for insert
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists school_student_invitations_update_tenant_staff
on school_student_invitations
for update
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create table if not exists event_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  media_id uuid not null references media_assets(id) on delete cascade,
  uploaded_by_user_id uuid null references auth.users(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, media_id)
);

create unique index if not exists idx_event_media_event_sort
  on event_media(event_id, sort_order);

create index if not exists idx_event_media_tenant_event
  on event_media(tenant_id, event_id);

alter table event_media enable row level security;

create policy if not exists event_media_select_public_or_member
on event_media
for select
using (
  app.is_tenant_member(tenant_id)
  or exists (
    select 1
    from events e
    join school_public_profiles spp on spp.tenant_id = e.tenant_id
    where e.id = event_media.event_id
      and e.status = 'published'
      and spp.is_public = true
  )
);

create policy if not exists event_media_insert_tenant_staff
on event_media
for insert
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists event_media_delete_tenant_staff
on event_media
for delete
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create table if not exists content_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  content_type text not null check (content_type in ('post', 'profile')),
  content_id uuid not null,
  reported_by_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('inappropriate', 'spam', 'harassment', 'minor_safety', 'other')),
  description text null,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  action_taken text null check (action_taken in ('none', 'warned', 'hidden', 'deleted')),
  moderator_user_id uuid null references auth.users(id) on delete set null,
  resolution_notes text null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reported_by_user_id, content_type, content_id)
);

create index if not exists idx_content_reports_tenant_status_created
  on content_reports(tenant_id, status, created_at desc);

create index if not exists idx_content_reports_content
  on content_reports(content_type, content_id);

drop trigger if exists set_updated_at_content_reports on content_reports;
create trigger set_updated_at_content_reports
before update on content_reports
for each row execute function app.set_updated_at();

alter table content_reports enable row level security;

create policy if not exists content_reports_select_owner_or_tenant_staff
on content_reports
for select
using (
  reported_by_user_id = auth.uid()
  or app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[])
);

create policy if not exists content_reports_insert_authenticated_owner
on content_reports
for insert
with check (reported_by_user_id = auth.uid());

create policy if not exists content_reports_update_tenant_staff
on content_reports
for update
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create table if not exists content_report_audit_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references content_reports(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('created', 'status_updated', 'action_taken')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_report_audit_log_report_created
  on content_report_audit_log(report_id, created_at desc);

alter table content_report_audit_log enable row level security;

create policy if not exists content_report_audit_log_select_tenant_staff
on content_report_audit_log
for select
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists content_report_audit_log_insert_tenant_staff
on content_report_audit_log
for insert
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

commit;
