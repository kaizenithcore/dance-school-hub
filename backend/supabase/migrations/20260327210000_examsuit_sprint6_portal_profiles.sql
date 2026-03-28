begin;

create table if not exists student_exam_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  organization_id uuid references exam_organizations(id) on delete set null,
  public_profile_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_exam_profiles_user_idx
  on student_exam_profiles(user_id);

create index if not exists student_exam_profiles_org_idx
  on student_exam_profiles(organization_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_student_exam_profiles_updated_at') then
    create trigger set_student_exam_profiles_updated_at
      before update on student_exam_profiles
      for each row
      execute function app.set_updated_at();
  end if;
end $$;

alter table student_exam_profiles enable row level security;

create policy if not exists student_exam_profiles_select_scope
on student_exam_profiles for select
using (
  user_id = auth.uid()
  or (
    organization_id is not null
    and exists (
      select 1
      from organization_memberships om
      where om.organization_id = student_exam_profiles.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  )
);

create policy if not exists student_exam_profiles_insert_owner
on student_exam_profiles for insert
with check (
  user_id = auth.uid()
  and (
    organization_id is null
    or exists (
      select 1
      from organization_memberships om
      where om.organization_id = student_exam_profiles.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  )
);

create policy if not exists student_exam_profiles_update_owner
on student_exam_profiles for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    organization_id is null
    or exists (
      select 1
      from organization_memberships om
      where om.organization_id = student_exam_profiles.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  )
);

commit;