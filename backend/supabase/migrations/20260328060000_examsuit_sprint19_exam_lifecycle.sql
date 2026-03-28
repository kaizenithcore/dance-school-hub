begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_exam_session_status'
      and e.enumlabel = 'published'
  ) then
    alter type app_exam_session_status add value 'published';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_exam_session_status'
      and e.enumlabel = 'enrollment_open'
  ) then
    alter type app_exam_session_status add value 'enrollment_open';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_exam_session_status'
      and e.enumlabel = 'evaluated'
  ) then
    alter type app_exam_session_status add value 'evaluated';
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_exam_session_status'
      and e.enumlabel = 'certified'
  ) then
    alter type app_exam_session_status add value 'certified';
  end if;
end $$;

update exam_sessions
set status = 'enrollment_open'
where status = 'open';

update exam_sessions
set status = 'certified'
where status = 'completed';

commit;