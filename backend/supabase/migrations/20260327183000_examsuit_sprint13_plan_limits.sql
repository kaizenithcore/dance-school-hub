begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_exam_subscription_plan'
      and e.enumlabel = 'pro'
  ) then
    alter type app_exam_subscription_plan add value 'pro';
  end if;
end $$;

commit;
