begin;

-- Phase 9: school follows for onboarding and personalized school feed

create table if not exists student_school_follows (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'onboarding', 'import')),
  created_at timestamptz not null default now(),
  unique (student_profile_id, tenant_id)
);

create index if not exists idx_student_school_follows_profile_created
  on student_school_follows(student_profile_id, created_at desc);

create index if not exists idx_student_school_follows_tenant
  on student_school_follows(tenant_id);

alter table student_school_follows enable row level security;

create policy if not exists student_school_follows_select_owner_or_tenant_member
on student_school_follows
for select
using (
  exists (
    select 1
    from student_profiles sp
    where sp.id = student_school_follows.student_profile_id
      and sp.user_id = auth.uid()
  )
  or app.is_tenant_member(student_school_follows.tenant_id)
);

create policy if not exists student_school_follows_insert_owner
on student_school_follows
for insert
with check (
  exists (
    select 1
    from student_profiles sp
    where sp.id = student_school_follows.student_profile_id
      and sp.user_id = auth.uid()
  )
);

create policy if not exists student_school_follows_delete_owner
on student_school_follows
for delete
using (
  exists (
    select 1
    from student_profiles sp
    where sp.id = student_school_follows.student_profile_id
      and sp.user_id = auth.uid()
  )
);

commit;
