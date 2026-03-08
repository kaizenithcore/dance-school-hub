alter table if exists class_schedules
add column if not exists is_locked boolean not null default false;
