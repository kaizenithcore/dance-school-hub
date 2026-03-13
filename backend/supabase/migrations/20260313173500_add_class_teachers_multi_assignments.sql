-- Support multiple teachers per class while keeping backward compatibility

create table if not exists class_teachers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, teacher_id)
);

create index if not exists idx_class_teachers_tenant on class_teachers(tenant_id);
create index if not exists idx_class_teachers_class on class_teachers(class_id);
create index if not exists idx_class_teachers_teacher on class_teachers(teacher_id);

-- Backfill from legacy classes.teacher_id column
insert into class_teachers (tenant_id, class_id, teacher_id)
select c.tenant_id, c.id, c.teacher_id
from classes c
where c.teacher_id is not null
on conflict (class_id, teacher_id) do nothing;

alter table class_teachers enable row level security;

create policy if not exists class_teachers_select_member
on class_teachers
for select
using (app.is_tenant_member(tenant_id));

create policy if not exists class_teachers_write_admin
on class_teachers
for all
using (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]))
with check (app.has_tenant_role(tenant_id, array['owner','admin','staff']::app_tenant_role[]));
