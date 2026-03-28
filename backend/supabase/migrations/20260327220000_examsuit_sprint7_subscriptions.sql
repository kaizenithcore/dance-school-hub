begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_exam_subscription_plan_type') then
    create type app_exam_subscription_plan_type as enum ('exam_suit', 'starter', 'pro', 'enterprise');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_exam_subscription_plan') then
    create type app_exam_subscription_plan as enum ('core', 'lite');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_exam_subscription_billing_cycle') then
    create type app_exam_subscription_billing_cycle as enum ('monthly', 'annual');
  end if;
end $$;

create table if not exists exam_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references exam_organizations(id) on delete cascade,
  plan_type app_exam_subscription_plan_type not null default 'exam_suit',
  plan app_exam_subscription_plan not null default 'lite',
  billing_cycle app_exam_subscription_billing_cycle not null default 'monthly',
  active boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id),
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists exam_subscriptions_org_idx on exam_subscriptions(organization_id);
create index if not exists exam_subscriptions_active_idx on exam_subscriptions(active);
create index if not exists exam_subscriptions_plan_idx on exam_subscriptions(plan);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_exam_subscriptions_updated_at') then
    create trigger set_exam_subscriptions_updated_at
      before update on exam_subscriptions
      for each row
      execute function app.set_updated_at();
  end if;
end $$;

alter table exam_subscriptions enable row level security;

create policy if not exists exam_subscriptions_select_scope
on exam_subscriptions for select
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_subscriptions.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy if not exists exam_subscriptions_write_scope
on exam_subscriptions for all
using (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_subscriptions.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from organization_memberships om
    where om.organization_id = exam_subscriptions.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
      and om.role in ('owner', 'admin')
  )
);

commit;