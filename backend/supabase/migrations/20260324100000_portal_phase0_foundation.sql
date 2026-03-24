begin;

-- Phase 0 foundation for Student Portal ecosystem

create table if not exists student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  tenant_id uuid null references tenants(id) on delete set null,
  student_id uuid null unique references students(id) on delete set null,
  display_name text not null,
  stage_name text null,
  bio text null,
  avatar_url text null,
  city text null,
  styles text[] not null default '{}'::text[],
  level text null,
  years_experience integer null check (years_experience is null or years_experience >= 0),
  public_profile boolean not null default true,
  xp integer not null default 0 check (xp >= 0),
  level_number integer not null default 1 check (level_number >= 1),
  streak_count integer not null default 0 check (streak_count >= 0),
  followers_count integer not null default 0 check (followers_count >= 0),
  following_count integer not null default 0 check (following_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_followers (
  id uuid primary key default gen_random_uuid(),
  follower_profile_id uuid not null references student_profiles(id) on delete cascade,
  following_profile_id uuid not null references student_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_profile_id, following_profile_id),
  check (follower_profile_id <> following_profile_id)
);

create table if not exists school_public_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text null,
  logo_url text null,
  location text null,
  activity_level text not null default 'new',
  total_students integer not null default 0 check (total_students >= 0),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_discovery_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id) on delete cascade,
  views_count integer not null default 0 check (views_count >= 0),
  followers_count integer not null default 0 check (followers_count >= 0),
  conversion_rate numeric(5,2) not null default 0 check (conversion_rate >= 0 and conversion_rate <= 100),
  featured_until timestamptz null,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_feed_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  author_user_id uuid null references auth.users(id) on delete set null,
  author_type text not null check (author_type in ('school', 'teacher')),
  author_name text not null,
  author_avatar_url text null,
  type text not null check (type in ('class', 'event', 'achievement', 'announcement', 'choreography')),
  content text not null,
  image_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(image_urls) = 'array'),
  video_url text null,
  is_public boolean not null default true,
  likes_count integer not null default 0 check (likes_count >= 0),
  saves_count integer not null default 0 check (saves_count >= 0),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feed_interactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  post_id uuid not null references school_feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid null references student_profiles(id) on delete set null,
  interaction_type text not null check (interaction_type in ('like', 'save')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, interaction_type)
);

create table if not exists user_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  action_url text null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

-- Triggers

drop trigger if exists set_updated_at_student_profiles on student_profiles;
create trigger set_updated_at_student_profiles
before update on student_profiles
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_school_public_profiles on school_public_profiles;
create trigger set_updated_at_school_public_profiles
before update on school_public_profiles
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_school_discovery_metrics on school_discovery_metrics;
create trigger set_updated_at_school_discovery_metrics
before update on school_discovery_metrics
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_school_feed_posts on school_feed_posts;
create trigger set_updated_at_school_feed_posts
before update on school_feed_posts
for each row execute function app.set_updated_at();

-- Indexes

create index if not exists idx_student_profiles_user_id on student_profiles(user_id);
create index if not exists idx_student_profiles_tenant_id on student_profiles(tenant_id);
create index if not exists idx_student_profiles_public_active on student_profiles(public_profile, is_active);

create index if not exists idx_student_followers_following_profile on student_followers(following_profile_id);
create index if not exists idx_student_followers_follower_profile on student_followers(follower_profile_id);

create index if not exists idx_school_public_profiles_tenant_public on school_public_profiles(tenant_id, is_public);
create index if not exists idx_school_public_profiles_slug on school_public_profiles(slug);

create index if not exists idx_school_discovery_metrics_tenant on school_discovery_metrics(tenant_id);
create index if not exists idx_school_discovery_metrics_featured on school_discovery_metrics(featured_until);

create index if not exists idx_school_feed_posts_tenant_public_published on school_feed_posts(tenant_id, is_public, published_at desc);
create index if not exists idx_school_feed_posts_type on school_feed_posts(type);

create index if not exists idx_feed_interactions_post_type on feed_interactions(post_id, interaction_type);
create index if not exists idx_feed_interactions_user on feed_interactions(user_id);

create index if not exists idx_user_notifications_user_read_created on user_notifications(user_id, is_read, created_at desc);

-- RLS

alter table student_profiles enable row level security;
alter table student_followers enable row level security;
alter table school_public_profiles enable row level security;
alter table school_discovery_metrics enable row level security;
alter table school_feed_posts enable row level security;
alter table feed_interactions enable row level security;
alter table user_notifications enable row level security;

create policy if not exists student_profiles_select_public_or_owner
on student_profiles
for select
using (
  public_profile = true
  or user_id = auth.uid()
  or (tenant_id is not null and app.is_tenant_member(tenant_id))
);

create policy if not exists student_profiles_insert_owner
on student_profiles
for insert
with check (user_id = auth.uid());

create policy if not exists student_profiles_update_owner
on student_profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy if not exists student_followers_select_related
on student_followers
for select
using (
  exists (
    select 1
    from student_profiles sp
    where sp.id in (follower_profile_id, following_profile_id)
      and (sp.public_profile = true or sp.user_id = auth.uid())
  )
);

create policy if not exists student_followers_write_owner
on student_followers
for all
using (
  exists (
    select 1
    from student_profiles sp
    where sp.id = follower_profile_id
      and sp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from student_profiles sp
    where sp.id = follower_profile_id
      and sp.user_id = auth.uid()
  )
);

create policy if not exists school_public_profiles_select_public
on school_public_profiles
for select
using (
  is_public = true
  or app.is_tenant_member(tenant_id)
);

create policy if not exists school_public_profiles_write_tenant_admin
on school_public_profiles
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists school_discovery_metrics_select_public
on school_discovery_metrics
for select
using (
  exists (
    select 1
    from school_public_profiles spp
    where spp.tenant_id = school_discovery_metrics.tenant_id
      and spp.is_public = true
  )
  or app.is_tenant_member(tenant_id)
);

create policy if not exists school_discovery_metrics_write_tenant_admin
on school_discovery_metrics
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists school_feed_posts_select_public
on school_feed_posts
for select
using (
  is_public = true
  or app.is_tenant_member(tenant_id)
);

create policy if not exists school_feed_posts_write_tenant_admin
on school_feed_posts
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));

create policy if not exists feed_interactions_select_member_or_owner
on feed_interactions
for select
using (
  user_id = auth.uid()
  or app.is_tenant_member(tenant_id)
);

create policy if not exists feed_interactions_insert_authenticated
on feed_interactions
for insert
with check (user_id = auth.uid());

create policy if not exists feed_interactions_delete_owner
on feed_interactions
for delete
using (user_id = auth.uid());

create policy if not exists user_notifications_select_owner
on user_notifications
for select
using (user_id = auth.uid());

create policy if not exists user_notifications_update_owner
on user_notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy if not exists user_notifications_insert_tenant_admin_or_owner
on user_notifications
for insert
with check (
  user_id = auth.uid()
  or (tenant_id is not null and app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
);

-- Backfill public school profiles for existing tenants
insert into school_public_profiles (tenant_id, name, slug, description, activity_level, total_students, is_public)
select
  t.id,
  t.name,
  t.slug,
  null,
  'new',
  (
    select count(*)::integer
    from students s
    where s.tenant_id = t.id
      and s.status = 'active'
  ) as total_students,
  true
from tenants t
on conflict (tenant_id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  total_students = excluded.total_students,
  updated_at = now();

insert into school_discovery_metrics (tenant_id, views_count, followers_count, conversion_rate)
select
  t.id,
  0,
  0,
  0
from tenants t
on conflict (tenant_id) do nothing;

commit;
