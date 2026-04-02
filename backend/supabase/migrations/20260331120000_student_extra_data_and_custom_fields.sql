alter table students
  add column if not exists extra_data jsonb not null default '{}'::jsonb;

create table if not exists school_student_fields (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references tenants(id) on delete cascade,
  key text not null,
  label text not null,
  type text not null check (type in ('text', 'number', 'date', 'select')),
  required boolean not null default false,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, key)
);

create index if not exists idx_school_student_fields_school_id
  on school_student_fields(school_id);
