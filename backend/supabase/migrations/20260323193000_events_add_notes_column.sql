begin;

alter table if exists events
  add column if not exists notes text null;

commit;