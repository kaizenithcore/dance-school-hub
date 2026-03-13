alter table if exists students
  add column if not exists payer_type text check (payer_type in ('student', 'guardian', 'other')) default 'student',
  add column if not exists payer_name text,
  add column if not exists payer_email text,
  add column if not exists payer_phone text,
  add column if not exists preferred_payment_method text check (preferred_payment_method in ('transfer', 'cash', 'card', 'mercadopago')) default 'cash',
  add column if not exists account_number text;

create index if not exists idx_students_tenant_payer_type on students(tenant_id, payer_type);
create index if not exists idx_students_tenant_payment_method on students(tenant_id, preferred_payment_method);
