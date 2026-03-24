-- Portal phase 7: media assets for school feed posts

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('image', 'video')),
  provider text not null default 'supabase',
  bucket text,
  path text,
  url text not null,
  thumbnail_url text,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_seconds numeric(8,2),
  processing_status text not null default 'ready' check (processing_status in ('pending', 'processing', 'ready', 'failed')),
  processing_metadata jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_media_assets_tenant_created
  on media_assets (tenant_id, created_at desc);

create table if not exists school_feed_post_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  post_id uuid not null references school_feed_posts(id) on delete cascade,
  media_id uuid not null references media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, media_id)
);

create unique index if not exists idx_school_feed_post_media_post_sort
  on school_feed_post_media (post_id, sort_order);

create index if not exists idx_school_feed_post_media_tenant_post
  on school_feed_post_media (tenant_id, post_id);

create index if not exists idx_school_feed_post_media_media
  on school_feed_post_media (media_id);

create or replace function set_updated_at_media_assets()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_media_assets_updated_at on media_assets;
create trigger trg_media_assets_updated_at
before update on media_assets
for each row execute function set_updated_at_media_assets();
