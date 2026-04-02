begin;

alter table teachers
add column if not exists salay numeric(10, 2) default 0 check (salay >= 0);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'teachers'
      and column_name = 'aulary'
  ) then
    execute '
      update teachers
      set salay = coalesce(aulary, 0)
      where salay is null or salay = 0
    ';
  end if;
end $$;

commit;
