begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_brand_font_family') then
    create type app_brand_font_family as enum ('inter', 'poppins', 'montserrat', 'lato');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_brand_style_variant') then
    create type app_brand_style_variant as enum ('clean', 'rounded', 'bold');
  end if;
end $$;

create table if not exists tenant_branding (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id) on delete cascade,
  logo_url text,
  primary_color text not null default '#7C3AED' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#F1F5F9' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text default '#A78BFA' check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_family app_brand_font_family not null default 'inter',
  style_variant app_brand_style_variant not null default 'clean',
  updated_at timestamptz not null default now()
);

insert into tenant_branding (tenant_id)
select t.id
from tenants t
left join tenant_branding tb on tb.tenant_id = t.id
where tb.tenant_id is null;

alter table tenant_branding enable row level security;

create policy if not exists tenant_branding_select_scope
on tenant_branding for select
using (
  exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = tenant_branding.tenant_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
);

create policy if not exists tenant_branding_write_scope
on tenant_branding for all
using (
  exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = tenant_branding.tenant_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = tenant_branding.tenant_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  )
);

drop trigger if exists set_updated_at_tenant_branding on tenant_branding;
create trigger set_updated_at_tenant_branding
before update on tenant_branding
for each row execute function app.set_updated_at();

commit;
