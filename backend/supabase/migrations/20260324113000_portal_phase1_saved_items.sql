begin;

create table if not exists student_saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid null references tenants(id) on delete set null,
  item_type text not null check (item_type in ('post', 'event')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create index if not exists idx_student_saved_items_user_created
  on student_saved_items(user_id, created_at desc);

create index if not exists idx_student_saved_items_item
  on student_saved_items(item_type, item_id);

alter table student_saved_items enable row level security;

create policy if not exists student_saved_items_select_owner
on student_saved_items
for select
using (user_id = auth.uid());

create policy if not exists student_saved_items_insert_owner
on student_saved_items
for insert
with check (user_id = auth.uid());

create policy if not exists student_saved_items_delete_owner
on student_saved_items
for delete
using (user_id = auth.uid());

commit;
