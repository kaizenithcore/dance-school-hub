-- Public demo tenant seed (static dataset)
-- Goal: conversion-oriented public demo with fictional data and no real-school data exposure.

begin;

-- 1) Canonical demo tenant
insert into tenants (id, name, slug, is_active, created_at, updated_at)
values (
  '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
  'Escuela Demo Nexa',
  'escuela-demo-nexa',
  true,
  now(),
  now()
)
on conflict (slug) do update
set
  name = excluded.name,
  is_active = true,
  updated_at = now();

-- 2) Demo school settings + public profile + static conversion metadata
insert into school_settings (
  tenant_id,
  branding,
  enrollment_config,
  payment_config,
  schedule_config,
  notification_config,
  updated_at
)
values (
  '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
  jsonb_build_object(
    'schoolName', 'Escuela Demo Nexa',
    'primaryColor', '#0f766e',
    'accentColor', '#f59e0b'
  ),
  jsonb_build_object(
    'public_profile', jsonb_build_object(
      'tagline', 'La forma mas facil de gestionar tu escuela de danza',
      'description', 'Demo publica con datos ficticios para explorar el valor de Nexa en menos de 3 minutos.',
      'address', 'Calle Coreografia 12, Madrid',
      'phone', '+34 910 000 321',
      'email', 'demo@nexa.es',
      'website', 'https://nexa.es'
    ),
    'demo_mode', true
  ),
  jsonb_build_object(
    'planType', 'pro',
    'features', jsonb_build_object(
      'waitlist', true,
      'renewals', true,
      'massCommunicationEmail', true,
      'courseClone', true,
      'scheduleProposals', true,
      'scheduleInsights', true
    )
  ),
  jsonb_build_object(
    'startHour', '09:00',
    'endHour', '22:00',
    'workDays', jsonb_build_array('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'),
    'recurringSelectionMode', 'linked'
  ),
  '{}'::jsonb,
  now()
)
on conflict (tenant_id) do update
set
  branding = excluded.branding,
  enrollment_config = excluded.enrollment_config,
  payment_config = excluded.payment_config,
  schedule_config = excluded.schedule_config,
  notification_config = excluded.notification_config,
  updated_at = now();

-- 3) Reset current demo records (idempotent seed)
delete from payments where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from enrollments where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from guardians where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from students where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from class_schedules where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from classes where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from rooms where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from teachers where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from disciplines where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from categories where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';

-- 4) Commercial-friendly catalog entities
insert into disciplines (id, tenant_id, name, description, is_active, created_at, updated_at)
values
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Ballet', 'Tecnica clasica y repertorio', true, now(), now()),
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Hip Hop', 'Danza urbana y coreografia', true, now(), now()),
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Contemporaneo', 'Expresion y movilidad', true, now(), now()),
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Latino', 'Salsa y bachata social', true, now(), now());

insert into categories (id, tenant_id, name, description, is_active, created_at, updated_at)
values
  ('92a97a66-13bf-4a8f-98ff-2743aeb10001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Kids', 'Ninos y adolescentes', true, now(), now()),
  ('92a97a66-13bf-4a8f-98ff-2743aeb10002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Adultos', 'Grupos adultos', true, now(), now()),
  ('92a97a66-13bf-4a8f-98ff-2743aeb10003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Pro', 'Nivel avanzado y escenario', true, now(), now());

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'teachers'
      and column_name = 'aulary'
  ) then
    insert into teachers (id, tenant_id, name, email, phone, bio, status, aulary, created_at, updated_at)
    values
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Clara Mendez', 'clara@demo.nexa.es', '+34 611 100 001', 'Especialista en ballet y tecnica de puntas.', 'active', 0, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Diego Luna', 'diego@demo.nexa.es', '+34 611 100 002', 'Coreografo de danza urbana y competencias.', 'active', 0, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Irene Soto', 'irene@demo.nexa.es', '+34 611 100 003', 'Contemporaneo y preparacion fisica.', 'active', 0, now(), now());
  else
    insert into teachers (id, tenant_id, name, email, phone, bio, status, created_at, updated_at)
    values
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Clara Mendez', 'clara@demo.nexa.es', '+34 611 100 001', 'Especialista en ballet y tecnica de puntas.', 'active', now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Diego Luna', 'diego@demo.nexa.es', '+34 611 100 002', 'Coreografo de danza urbana y competencias.', 'active', now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Irene Soto', 'irene@demo.nexa.es', '+34 611 100 003', 'Contemporaneo y preparacion fisica.', 'active', now(), now());
  end if;
end $$;

insert into rooms (id, tenant_id, name, capacity, description, is_active, created_at, updated_at)
values
  ('b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Sala Principal', 28, 'Sala premium con espejo completo y sonido profesional.', true, now(), now()),
  ('b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Studio 2', 18, 'Sala para grupos reducidos y entrenamientos tecnicos.', true, now(), now()),
  ('b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Sala Urbana', 22, 'Sala orientada a hip hop y ensayos.', true, now(), now());

insert into classes (
  id,
  tenant_id,
  name,
  teacher_id,
  room_id,
  capacity,
  price_cents,
  description,
  status,
  discipline_id,
  category_id,
  weekly_frequency,
  created_at,
  updated_at
)
values
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Ballet Adultos Intermedio', 'a6fd4fe8-2997-4f44-ae08-3e41daedb001', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 24, 5900, 'Clase estrella orientada a tecnica + repertorio mensual.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c001', '92a97a66-13bf-4a8f-98ff-2743aeb10002', 2, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Hip Hop Performance', 'a6fd4fe8-2997-4f44-ae08-3e41daedb002', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 20, 5200, 'Coreografias para escenario y competicion.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c002', '92a97a66-13bf-4a8f-98ff-2743aeb10003', 2, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Contemporaneo Express', 'a6fd4fe8-2997-4f44-ae08-3e41daedb003', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', 16, 4900, 'Formato intensivo para adultos con poco tiempo.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c003', '92a97a66-13bf-4a8f-98ff-2743aeb10002', 1, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Bachata Social', 'a6fd4fe8-2997-4f44-ae08-3e41daedb002', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 26, 4300, 'Clase social ideal para nuevos alumnos.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c004', '92a97a66-13bf-4a8f-98ff-2743aeb10002', 1, now(), now());

insert into class_schedules (
  id,
  tenant_id,
  class_id,
  room_id,
  weekday,
  start_time,
  end_time,
  recurrence,
  effective_from,
  is_active,
  created_at,
  updated_at
)
values
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1001', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 2, '19:00:00', '20:30:00', '{"type":"weekly"}'::jsonb, '2026-03-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1001', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 4, '19:00:00', '20:30:00', '{"type":"weekly"}'::jsonb, '2026-03-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1002', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 1, '18:00:00', '19:30:00', '{"type":"weekly"}'::jsonb, '2026-03-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1002', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 3, '18:00:00', '19:30:00', '{"type":"weekly"}'::jsonb, '2026-03-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1003', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', 5, '17:30:00', '19:00:00', '{"type":"weekly"}'::jsonb, '2026-03-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1004', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 6, '11:00:00', '12:30:00', '{"type":"weekly"}'::jsonb, '2026-03-01', true, now(), now());

insert into students (
  id,
  tenant_id,
  name,
  email,
  phone,
  date_of_birth,
  status,
  payment_type,
  join_date,
  notes,
  created_at,
  updated_at
)
values
  ('f8d13b7a-d2f4-4e9d-a260-9d8c186a0001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Nora Castillo', 'nora.castillo@demo-mail.com', '+34 611 220 001', '2000-04-12', 'active', 'monthly', '2026-02-01', 'Perfil ficticio para demo.', now(), now()),
  ('f8d13b7a-d2f4-4e9d-a260-9d8c186a0002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Leo Martin', 'leo.martin@demo-mail.com', '+34 611 220 002', '1996-09-22', 'active', 'monthly', '2026-02-05', 'Perfil ficticio para demo.', now(), now()),
  ('f8d13b7a-d2f4-4e9d-a260-9d8c186a0003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Sara Nieto', 'sara.nieto@demo-mail.com', '+34 611 220 003', '1992-11-17', 'active', 'monthly', '2026-02-10', 'Perfil ficticio para demo.', now(), now()),
  ('f8d13b7a-d2f4-4e9d-a260-9d8c186a0004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Alex Rivas', 'alex.rivas@demo-mail.com', '+34 611 220 004', '2004-02-03', 'active', 'monthly', '2026-02-10', 'Perfil ficticio para demo.', now(), now()),
  ('f8d13b7a-d2f4-4e9d-a260-9d8c186a0005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Irene Costa', 'irene.costa@demo-mail.com', '+34 611 220 005', '1999-06-07', 'active', 'monthly', '2026-02-15', 'Perfil ficticio para demo.', now(), now()),
  ('f8d13b7a-d2f4-4e9d-a260-9d8c186a0006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Pablo Rey', 'pablo.rey@demo-mail.com', '+34 611 220 006', '1988-08-30', 'active', 'monthly', '2026-02-18', 'Perfil ficticio para demo.', now(), now());

insert into enrollments (
  id,
  tenant_id,
  student_id,
  class_id,
  status,
  payment_status,
  payment_method,
  student_snapshot,
  confirmed_at,
  created_at,
  updated_at
)
values
  ('1b7f4780-ac64-4db0-8c84-06c00ec50001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0001', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1001', 'confirmed', 'paid', 'card', '{"source":"demo_seed"}'::jsonb, now(), now(), now()),
  ('1b7f4780-ac64-4db0-8c84-06c00ec50002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0002', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1001', 'confirmed', 'paid', 'card', '{"source":"demo_seed"}'::jsonb, now(), now(), now()),
  ('1b7f4780-ac64-4db0-8c84-06c00ec50003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0003', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1002', 'confirmed', 'pending', 'transfer', '{"source":"demo_seed"}'::jsonb, now(), now(), now()),
  ('1b7f4780-ac64-4db0-8c84-06c00ec50004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0004', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1002', 'confirmed', 'paid', 'cash', '{"source":"demo_seed"}'::jsonb, now(), now(), now()),
  ('1b7f4780-ac64-4db0-8c84-06c00ec50005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0005', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1003', 'confirmed', 'paid', 'card', '{"source":"demo_seed"}'::jsonb, now(), now(), now()),
  ('1b7f4780-ac64-4db0-8c84-06c00ec50006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0006', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1004', 'confirmed', 'pending', 'transfer', '{"source":"demo_seed"}'::jsonb, now(), now(), now());

insert into payments (
  id,
  tenant_id,
  enrollment_id,
  student_id,
  amount_cents,
  currency,
  status,
  provider,
  paid_at,
  due_at,
  metadata,
  created_at,
  updated_at
)
values
  ('2c9c9c10-7a95-4db2-b91f-5d5a3c550001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', '1b7f4780-ac64-4db0-8c84-06c00ec50001', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0001', 5900, 'EUR', 'paid', 'card', '2026-01-05T10:00:00Z', '2026-01-05T10:00:00Z', '{"month":"2026-01","payer_name":"Nora Castillo"}'::jsonb, now(), now()),
  ('2c9c9c10-7a95-4db2-b91f-5d5a3c550002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', '1b7f4780-ac64-4db0-8c84-06c00ec50001', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0001', 5900, 'EUR', 'paid', 'card', '2026-02-05T10:00:00Z', '2026-02-05T10:00:00Z', '{"month":"2026-02","payer_name":"Nora Castillo"}'::jsonb, now(), now()),
  ('2c9c9c10-7a95-4db2-b91f-5d5a3c550003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', '1b7f4780-ac64-4db0-8c84-06c00ec50002', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0002', 5900, 'EUR', 'paid', 'transfer', '2026-01-07T10:00:00Z', '2026-01-07T10:00:00Z', '{"month":"2026-01","payer_name":"Leo Martin","account_number":"ES76 1234 5678 9012"}'::jsonb, now(), now()),
  ('2c9c9c10-7a95-4db2-b91f-5d5a3c550004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', '1b7f4780-ac64-4db0-8c84-06c00ec50002', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0002', 5900, 'EUR', 'paid', 'transfer', '2026-02-07T10:00:00Z', '2026-02-07T10:00:00Z', '{"month":"2026-02","payer_name":"Leo Martin","account_number":"ES76 1234 5678 9012"}'::jsonb, now(), now()),
  ('2c9c9c10-7a95-4db2-b91f-5d5a3c550005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', '1b7f4780-ac64-4db0-8c84-06c00ec50004', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0004', 5200, 'EUR', 'paid', 'cash', '2026-02-14T18:00:00Z', '2026-02-14T18:00:00Z', '{"month":"2026-02","payer_name":"Alex Rivas"}'::jsonb, now(), now()),
  ('2c9c9c10-7a95-4db2-b91f-5d5a3c550006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', '1b7f4780-ac64-4db0-8c84-06c00ec50005', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0005', 4900, 'EUR', 'paid', 'card', '2026-03-01T09:00:00Z', '2026-03-01T09:00:00Z', '{"month":"2026-03","payer_name":"Irene Costa"}'::jsonb, now(), now()),
  ('2c9c9c10-7a95-4db2-b91f-5d5a3c550007', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', '1b7f4780-ac64-4db0-8c84-06c00ec50003', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0003', 5200, 'EUR', 'overdue', 'transfer', null, '2026-03-03T09:00:00Z', '{"month":"2026-03","payer_name":"Sara Nieto","account_number":"ES55 9999 0000 1234"}'::jsonb, now(), now()),
  ('2c9c9c10-7a95-4db2-b91f-5d5a3c550008', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', '1b7f4780-ac64-4db0-8c84-06c00ec50006', 'f8d13b7a-d2f4-4e9d-a260-9d8c186a0006', 4300, 'EUR', 'pending', 'transfer', null, '2026-03-05T09:00:00Z', '{"month":"2026-03","payer_name":"Pablo Rey","account_number":"ES10 4567 0000 0001"}'::jsonb, now(), now());

commit;

-- Verification queries
-- select id, name, slug from tenants where slug = 'escuela-demo-nexa';
-- select id, name, status from classes where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
-- select class_id, count(*) from enrollments where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' and status = 'confirmed' group by class_id;
