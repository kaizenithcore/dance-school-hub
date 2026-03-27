alter table if exists students
  add column if not exists address text,
  add column if not exists locality text,
  add column if not exists identity_document_type text check (identity_document_type in ('dni', 'passport')),
  add column if not exists identity_document_number text;

create index if not exists idx_students_tenant_locality on students(tenant_id, locality);
create index if not exists idx_students_tenant_identity_type on students(tenant_id, identity_document_type);
