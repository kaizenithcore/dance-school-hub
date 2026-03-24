begin;

-- Phase 8: audience visibility for feed posts + explicit gamification model

alter table if exists school_feed_posts
  add column if not exists visibility_scope text;

update school_feed_posts
set visibility_scope = case
  when is_public = true then 'public'
  else 'school'
end
where visibility_scope is null;

alter table school_feed_posts
  alter column visibility_scope set default 'public';

alter table school_feed_posts
  drop constraint if exists school_feed_posts_visibility_scope_check;

alter table school_feed_posts
  add constraint school_feed_posts_visibility_scope_check
  check (visibility_scope in ('public', 'followers', 'school'));

create index if not exists idx_school_feed_posts_visibility_scope_published
  on school_feed_posts(visibility_scope, published_at desc);

create table if not exists gamification_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('class_completed', 'event_attended', 'certification_passed')),
  source_table text not null,
  source_id text not null,
  xp_delta integer not null default 0 check (xp_delta >= 0),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, student_id, event_type, source_table, source_id)
);

create index if not exists idx_gamification_events_student_occurred
  on gamification_events(tenant_id, student_id, occurred_at desc);

create table if not exists achievements_definitions (
  id text primary key,
  title text not null,
  category text not null check (category in ('attendance', 'events', 'milestones', 'certifications')),
  metric_key text not null check (metric_key in ('class_completed_count', 'event_attended_count', 'certification_passed_count', 'total_xp')),
  threshold_value integer not null check (threshold_value > 0),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into achievements_definitions (id, title, category, metric_key, threshold_value, xp_reward, sort_order)
values
  ('first-class', 'Primera clase', 'milestones', 'class_completed_count', 1, 0, 10),
  ('classes-20', '20 clases completadas', 'attendance', 'class_completed_count', 20, 0, 20),
  ('events-3', '3 eventos asistidos', 'events', 'event_attended_count', 3, 0, 30),
  ('cert-1', 'Primera certificacion', 'certifications', 'certification_passed_count', 1, 0, 40),
  ('xp-1000', 'Nivel social 1K XP', 'milestones', 'total_xp', 1000, 0, 50)
on conflict (id) do update
set
  title = excluded.title,
  category = excluded.category,
  metric_key = excluded.metric_key,
  threshold_value = excluded.threshold_value,
  xp_reward = excluded.xp_reward,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  achievement_id text not null references achievements_definitions(id) on delete cascade,
  progress_value integer not null default 0,
  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, student_id, achievement_id)
);

create index if not exists idx_user_achievements_student
  on user_achievements(tenant_id, student_id, earned_at desc);

alter table gamification_events enable row level security;
alter table achievements_definitions enable row level security;
alter table user_achievements enable row level security;

create policy if not exists gamification_events_select_owner_or_tenant_staff
on gamification_events
for select
using (
  exists (
    select 1
    from student_profiles sp
    where sp.student_id = gamification_events.student_id
      and sp.user_id = auth.uid()
  )
  or app.has_tenant_role(gamification_events.tenant_id, array['owner','admin','staff']::app_tenant_role[])
);

create policy if not exists achievements_definitions_select_authenticated
on achievements_definitions
for select
using (auth.uid() is not null);

create policy if not exists user_achievements_select_owner_or_tenant_staff
on user_achievements
for select
using (
  exists (
    select 1
    from student_profiles sp
    where sp.student_id = user_achievements.student_id
      and sp.user_id = auth.uid()
  )
  or app.has_tenant_role(user_achievements.tenant_id, array['owner','admin','staff']::app_tenant_role[])
);

commit;
