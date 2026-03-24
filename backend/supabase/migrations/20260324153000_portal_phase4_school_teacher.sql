-- Phase 4: school admin + teacher content workflow + gallery

alter table if exists school_feed_posts
  add column if not exists approval_status text not null default 'published' check (approval_status in ('draft', 'pending_approval', 'published', 'rejected')),
  add column if not exists approval_notes text null;

create index if not exists idx_school_feed_posts_tenant_approval
  on school_feed_posts (tenant_id, approval_status, published_at desc);

create table if not exists school_gallery_albums (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text null,
  event_id uuid null references events(id) on delete set null,
  is_public boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_school_gallery_albums_tenant
  on school_gallery_albums (tenant_id, created_at desc);

create table if not exists school_gallery_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  album_id uuid not null references school_gallery_albums(id) on delete cascade,
  event_id uuid null references events(id) on delete set null,
  image_url text not null,
  caption text null,
  is_public boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_school_gallery_photos_album
  on school_gallery_photos (album_id, created_at desc);
