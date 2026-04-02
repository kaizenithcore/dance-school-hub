alter table school_student_fields
  add column if not exists visible_in_table boolean not null default false;
