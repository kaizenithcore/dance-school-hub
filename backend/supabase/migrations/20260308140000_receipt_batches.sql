-- Receipt batches and printable receipts

begin;

create table if not exists receipt_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  month text not null,
  payment_method_filter text not null default 'cash',
  status text not null default 'processing',
  generated_count integer not null default 0,
  failed_count integer not null default 0,
  template_version text not null default 'v1',
  branding_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipt_batches_valid_month check (month ~ '^\d{4}-\d{2}$'),
  constraint receipt_batches_valid_status check (status in ('processing', 'completed', 'failed'))
);

create index if not exists idx_receipt_batches_tenant on receipt_batches(tenant_id);
create index if not exists idx_receipt_batches_month on receipt_batches(month);
create index if not exists idx_receipt_batches_status on receipt_batches(status);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  batch_id uuid not null references receipt_batches(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete restrict,
  student_id uuid references students(id) on delete set null,
  receipt_number text not null,
  issued_at timestamptz not null default now(),
  amount_cents integer not null,
  currency text not null default 'EUR',
  status text not null default 'generated',
  payload_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint receipts_amount_positive check (amount_cents > 0),
  constraint receipts_status_valid check (status in ('generated', 'void')),
  unique (tenant_id, payment_id),
  unique (tenant_id, receipt_number)
);

create index if not exists idx_receipts_tenant on receipts(tenant_id);
create index if not exists idx_receipts_batch on receipts(batch_id);
create index if not exists idx_receipts_payment on receipts(payment_id);
create index if not exists idx_receipts_student on receipts(student_id);

alter table receipt_batches enable row level security;
alter table receipts enable row level security;

drop policy if exists "receipt_batches_read" on receipt_batches;
create policy "receipt_batches_read" on receipt_batches
  for select
  using (
    tenant_id in (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.user_id = auth.uid() and tm.is_active = true
    )
  );

drop policy if exists "receipt_batches_write" on receipt_batches;
create policy "receipt_batches_write" on receipt_batches
  for all
  using (
    tenant_id in (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.user_id = auth.uid() and tm.is_active = true and tm.role in ('owner', 'admin')
    )
  )
  with check (
    tenant_id in (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.user_id = auth.uid() and tm.is_active = true and tm.role in ('owner', 'admin')
    )
  );

drop policy if exists "receipts_read" on receipts;
create policy "receipts_read" on receipts
  for select
  using (
    tenant_id in (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.user_id = auth.uid() and tm.is_active = true
    )
  );

drop policy if exists "receipts_write" on receipts;
create policy "receipts_write" on receipts
  for all
  using (
    tenant_id in (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.user_id = auth.uid() and tm.is_active = true and tm.role in ('owner', 'admin')
    )
  )
  with check (
    tenant_id in (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.user_id = auth.uid() and tm.is_active = true and tm.role in ('owner', 'admin')
    )
  );

drop trigger if exists set_updated_at_receipt_batches on receipt_batches;
create trigger set_updated_at_receipt_batches
before update on receipt_batches
for each row execute function app.set_updated_at();

commit;
