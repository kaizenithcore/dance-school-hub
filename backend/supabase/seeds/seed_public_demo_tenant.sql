-- Public commercial demo seed (medium-size school: ~250 students)
-- Goal: one-click tenant prepared for buyer walkthroughs across core modules.

begin;

-- 1) Canonical demo tenant
insert into tenants (id, name, slug, is_active, created_at, updated_at)
values (
  '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
  'Escuela Demo DanceHub',
  'escuela-demo-dancehub',
  true,
  now(),
  now()
)
on conflict (slug) do update
set
  name = excluded.name,
  is_active = true,
  updated_at = now();

-- 2) Demo settings tuned for sales walkthrough
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
    'schoolName', 'Escuela Demo DanceHub',
    'primaryColor', '#0f766e',
    'accentColor', '#f59e0b'
  ),
  jsonb_build_object(
    'public_profile', jsonb_build_object(
      'tagline', 'Escuela urbana y clasica con gestion moderna',
      'description', 'Centro de danza ficticio con datos comerciales realistas para evaluar operativa, captacion y cobros en menos de 10 minutos.',
      'address', 'Calle Coreografia 12, Madrid',
      'phone', '+34 910 000 321',
      'email', 'demo@dancehub.es',
      'website', 'https://dancehub.es',
      'hasOptimizedWebsite', true
    ),
    'demo_mode', true
  ),
  jsonb_build_object(
    'planType', 'pro',
    'features', jsonb_build_object(
      'waitlistAutomation', true,
      'renewalAutomation', true,
      'massCommunicationEmail', true,
      'courseClone', true,
      'scheduleProposals', true,
      'scheduleInsights', true,
      'examSuite', true,
      'certifier', true
    ),
    'trialPaymentCompleted', true,
    'trialPaymentCompletedAt', now()::text
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

-- 3) Reset demo records (idempotent)
delete from event_schedule_items where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from event_sessions where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from event_resources where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from events where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';

delete from waitlist_offers where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from class_waitlist where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';

delete from renewal_offers where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from renewal_campaigns where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from clone_jobs where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';

delete from payments where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from enrollments where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from guardians where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from students where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';

delete from school_student_fields where school_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';

delete from class_schedules where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from classes where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from rooms where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from teachers where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from disciplines where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
delete from categories where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';

-- 4) Catalog entities
insert into disciplines (id, tenant_id, name, description, is_active, created_at, updated_at)
values
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Ballet', 'Tecnica clasica y repertorio', true, now(), now()),
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Hip Hop', 'Danza urbana y coreografia', true, now(), now()),
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Contemporaneo', 'Expresion y movilidad', true, now(), now()),
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Latino', 'Salsa y bachata social', true, now(), now()),
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Jazz', 'Tecnica, musicalidad y escenario', true, now(), now()),
  ('8ad10153-f8de-4ad9-b7a4-f0f18f39c006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Heels', 'Trabajo escenico y estilo', true, now(), now());

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
    where table_schema = 'public' and table_name = 'teachers' and column_name = 'salay'
  ) then
    insert into teachers (id, tenant_id, name, email, phone, bio, status, salay, created_at, updated_at)
    values
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Clara Mendez', 'clara@demo.dancehub.es', '+34 611 100 001', 'Especialista en ballet y tecnica de puntas.', 'active', 2450, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Diego Luna', 'diego@demo.dancehub.es', '+34 611 100 002', 'Coreografo de danza urbana y competicion.', 'active', 2300, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Irene Soto', 'irene@demo.dancehub.es', '+34 611 100 003', 'Contemporaneo y preparacion fisica.', 'active', 2100, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Mario Gil', 'mario@demo.dancehub.es', '+34 611 100 004', 'Latino social y formacion de parejas.', 'active', 2050, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Patricia Rios', 'patricia@demo.dancehub.es', '+34 611 100 005', 'Jazz tecnico para grupos teen y pro.', 'active', 2200, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Nerea Cano', 'nerea@demo.dancehub.es', '+34 611 100 006', 'Heels y puesta en escena.', 'active', 1950, now(), now());
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'teachers' and column_name = 'aulary'
  ) then
    insert into teachers (id, tenant_id, name, email, phone, bio, status, aulary, created_at, updated_at)
    values
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Clara Mendez', 'clara@demo.dancehub.es', '+34 611 100 001', 'Especialista en ballet y tecnica de puntas.', 'active', 2450, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Diego Luna', 'diego@demo.dancehub.es', '+34 611 100 002', 'Coreografo de danza urbana y competicion.', 'active', 2300, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Irene Soto', 'irene@demo.dancehub.es', '+34 611 100 003', 'Contemporaneo y preparacion fisica.', 'active', 2100, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Mario Gil', 'mario@demo.dancehub.es', '+34 611 100 004', 'Latino social y formacion de parejas.', 'active', 2050, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Patricia Rios', 'patricia@demo.dancehub.es', '+34 611 100 005', 'Jazz tecnico para grupos teen y pro.', 'active', 2200, now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Nerea Cano', 'nerea@demo.dancehub.es', '+34 611 100 006', 'Heels y puesta en escena.', 'active', 1950, now(), now());
  else
    insert into teachers (id, tenant_id, name, email, phone, bio, status, created_at, updated_at)
    values
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Clara Mendez', 'clara@demo.dancehub.es', '+34 611 100 001', 'Especialista en ballet y tecnica de puntas.', 'active', now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Diego Luna', 'diego@demo.dancehub.es', '+34 611 100 002', 'Coreografo de danza urbana y competicion.', 'active', now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Irene Soto', 'irene@demo.dancehub.es', '+34 611 100 003', 'Contemporaneo y preparacion fisica.', 'active', now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Mario Gil', 'mario@demo.dancehub.es', '+34 611 100 004', 'Latino social y formacion de parejas.', 'active', now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Patricia Rios', 'patricia@demo.dancehub.es', '+34 611 100 005', 'Jazz tecnico para grupos teen y pro.', 'active', now(), now()),
      ('a6fd4fe8-2997-4f44-ae08-3e41daedb006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Nerea Cano', 'nerea@demo.dancehub.es', '+34 611 100 006', 'Heels y puesta en escena.', 'active', now(), now());
  end if;
end $$;

insert into rooms (id, tenant_id, name, capacity, description, is_active, created_at, updated_at)
values
  ('b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Sala Principal', 30, 'Sala premium con espejo completo y sonido profesional.', true, now(), now()),
  ('b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Studio Norte', 22, 'Sala para grupos reducidos y entrenamientos tecnicos.', true, now(), now()),
  ('b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Sala Urbana', 26, 'Sala orientada a hip hop y ensayos.', true, now(), now()),
  ('b4de38dc-a29d-40b0-9a0a-53f6c3a2f004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Studio Sur', 18, 'Sala para grupos kids y particulares.', true, now(), now());

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
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Ballet Adultos Intermedio', 'a6fd4fe8-2997-4f44-ae08-3e41daedb001', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 24, 5900, 'Tecnica + repertorio mensual.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c001', '92a97a66-13bf-4a8f-98ff-2743aeb10002', 2, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Ballet Kids', 'a6fd4fe8-2997-4f44-ae08-3e41daedb001', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f004', 18, 4200, 'Iniciacion para ninos de 7 a 12 anos.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c001', '92a97a66-13bf-4a8f-98ff-2743aeb10001', 2, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Hip Hop Teens', 'a6fd4fe8-2997-4f44-ae08-3e41daedb002', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 24, 4700, 'Coreografias urbanas nivel intermedio.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c002', '92a97a66-13bf-4a8f-98ff-2743aeb10001', 2, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Hip Hop Performance', 'a6fd4fe8-2997-4f44-ae08-3e41daedb002', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 20, 5200, 'Preparacion escenica y competicion.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c002', '92a97a66-13bf-4a8f-98ff-2743aeb10003', 2, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Contemporaneo Adultos', 'a6fd4fe8-2997-4f44-ae08-3e41daedb003', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', 20, 4900, 'Movilidad y expresion corporal.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c003', '92a97a66-13bf-4a8f-98ff-2743aeb10002', 1, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Contemporaneo Pro', 'a6fd4fe8-2997-4f44-ae08-3e41daedb003', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 16, 6100, 'Nivel avanzado para escenario.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c003', '92a97a66-13bf-4a8f-98ff-2743aeb10003', 2, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1007', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Salsa Iniciacion', 'a6fd4fe8-2997-4f44-ae08-3e41daedb004', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 28, 4300, 'Clase social para nuevos alumnos.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c004', '92a97a66-13bf-4a8f-98ff-2743aeb10002', 1, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1008', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Bachata Intermedio', 'a6fd4fe8-2997-4f44-ae08-3e41daedb004', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', 22, 4600, 'Tecnica de pareja y social.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c004', '92a97a66-13bf-4a8f-98ff-2743aeb10002', 1, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1009', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Jazz Tecnico', 'a6fd4fe8-2997-4f44-ae08-3e41daedb005', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', 20, 5100, 'Base tecnica y diagonales.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c005', '92a97a66-13bf-4a8f-98ff-2743aeb10002', 2, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1010', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Jazz Teens', 'a6fd4fe8-2997-4f44-ae08-3e41daedb005', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f004', 18, 4500, 'Grupo junior orientado a shows.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c005', '92a97a66-13bf-4a8f-98ff-2743aeb10001', 1, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1011', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Heels Open', 'a6fd4fe8-2997-4f44-ae08-3e41daedb006', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 20, 5300, 'Clase abierta de estilo y escena.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c006', '92a97a66-13bf-4a8f-98ff-2743aeb10002', 1, now(), now()),
  ('c3f5bf31-2fd6-41c8-b970-2f0148bf1012', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'Heels Pro Team', 'a6fd4fe8-2997-4f44-ae08-3e41daedb006', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 16, 6200, 'Equipo de escenario y exhibicion.', 'active', '8ad10153-f8de-4ad9-b7a4-f0f18f39c006', '92a97a66-13bf-4a8f-98ff-2743aeb10003', 2, now(), now());

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
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1001', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 2, '19:00:00', '20:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1001', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 4, '19:00:00', '20:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371003', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1002', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f004', 1, '17:30:00', '18:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371004', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1002', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f004', 3, '17:30:00', '18:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371005', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1003', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 2, '18:00:00', '19:00:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371006', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1003', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 4, '18:00:00', '19:00:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371007', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1004', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 1, '20:00:00', '21:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371008', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1004', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 3, '20:00:00', '21:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371009', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1005', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', 5, '18:00:00', '19:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371010', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1006', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 2, '20:45:00', '22:00:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371011', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1006', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 4, '20:45:00', '22:00:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371012', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1007', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 6, '11:30:00', '13:00:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371013', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1008', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', 5, '20:00:00', '21:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371014', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1009', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', 1, '19:00:00', '20:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371015', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1009', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', 3, '19:00:00', '20:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371016', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1010', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f004', 6, '10:00:00', '11:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371017', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1011', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', 5, '21:00:00', '22:00:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371018', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1012', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 6, '13:00:00', '14:30:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now()),
  ('d7fca8a7-35fa-4fd9-8efa-c643ad371019', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'c3f5bf31-2fd6-41c8-b970-2f0148bf1012', 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', 3, '21:00:00', '22:00:00', '{"type":"weekly"}'::jsonb, '2026-01-01', true, now(), now());

-- 5) Students: 248 realistic demo records
with first_names as (
  select array[
    'Lucia','Mateo','Martina','Hugo','Valeria','Leo','Paula','Daniel','Sofia','Mario',
    'Carmen','Adrian','Irene','Javier','Nora','Pablo','Aitana','Alvaro','Claudia','Sergio',
    'Emma','Bruno','Elena','Diego','Sara','Alex','Marta','Ruben','Noa','Victor'
  ] as arr
),
last_names as (
  select array[
    'Garcia','Lopez','Martin','Sanchez','Perez','Gomez','Fernandez','Diaz','Ruiz','Alvarez',
    'Moreno','Romero','Navarro','Torres','Vega','Castro','Ortega','Molina','Delgado','Rey',
    'Cano','Rios','Costa','Soto','Luna','Nieto','Vidal','Campos','Herrero','Calvo'
  ] as arr
)
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
select
  gen_random_uuid(),
  '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
  fn.arr[((g - 1) % array_length(fn.arr, 1)) + 1] || ' ' || ln.arr[((g * 3 - 1) % array_length(ln.arr, 1)) + 1] || ' ' || ln.arr[((g * 7 - 1) % array_length(ln.arr, 1)) + 1],
  'alumno' || lpad(g::text, 3, '0') || '@demo.dancehub.es',
  '+34 6' || lpad((10000000 + g)::text, 8, '0'),
  (
    case
      when g <= 64 then current_date - ((8 * 365) + (g * 17 % 1800)) * interval '1 day'
      when g <= 214 then current_date - ((18 * 365) + (g * 19 % 7200)) * interval '1 day'
      else current_date - ((30 * 365) + (g * 23 % 8500)) * interval '1 day'
    end
  )::date,
  case when g <= 226 then 'active' else 'inactive' end,
  'monthly',
  (current_date - ((g * 5) % 540) * interval '1 day')::date,
  'Perfil demo comercial generado automaticamente',
  now() - ((g * 3) % 120) * interval '1 day',
  now() - ((g * 2) % 30) * interval '1 day'
from generate_series(1, 248) as g
cross join first_names fn
cross join last_names ln;

-- Custom fields visible in table/profile for realistic demos
insert into school_student_fields (
  school_id,
  key,
  label,
  type,
  required,
  visible,
  visible_in_table,
  created_at
)
values
  ('6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'dni', 'DNI', 'text', false, true, true, now()),
  ('6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'localidad', 'Localidad', 'text', false, true, true, now()),
  ('6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'contacto_emergencia', 'Contacto de emergencia', 'text', false, true, false, now()),
  ('6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'nivel_objetivo', 'Nivel objetivo', 'select', false, true, false, now());

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'extra_data'
  ) then
    update students
    set extra_data = jsonb_build_object(
      'dni', upper(substr(md5(id::text), 1, 8)),
      'localidad', (array['Madrid','Getafe','Leganes','Alcorcon','Mostoles'])[(1 + (abs(('x' || substr(md5(id::text), 1, 2))::bit(8)::int) % 5))],
      'contacto_emergencia', '+34 6' || lpad((20000000 + abs(('x' || substr(md5(id::text), 1, 6))::bit(24)::int % 9999999))::text, 8, '0'),
      'nivel_objetivo', (array['Iniciacion','Intermedio','Pro'])[(1 + (abs(('x' || substr(md5(id::text), 1, 2))::bit(8)::int) % 3))]
    )
    where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
  end if;
end $$;

-- 6) Enrollments (primary + secondary for a subset)
with class_pool as (
  select id, row_number() over(order by id) as idx
  from classes
  where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' and status = 'active'
),
active_students as (
  select id, name, row_number() over(order by created_at, id) as rn
  from students
  where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' and status = 'active'
)
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
select
  gen_random_uuid(),
  '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
  s.id,
  cp.id,
  'confirmed',
  case when s.rn % 9 = 0 then 'pending' else 'paid' end,
  case when s.rn % 3 = 0 then 'transfer' when s.rn % 5 = 0 then 'cash' else 'card' end,
  jsonb_build_object('source', 'demo_seed', 'student_name', s.name),
  now() - (s.rn % 45) * interval '1 day',
  now() - (s.rn % 90) * interval '1 day',
  now()
from active_students s
join class_pool cp on cp.idx = ((s.rn - 1) % 12) + 1;

with class_pool as (
  select id, row_number() over(order by id) as idx
  from classes
  where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' and status = 'active'
),
active_students as (
  select id, name, row_number() over(order by created_at, id) as rn
  from students
  where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' and status = 'active'
)
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
select
  gen_random_uuid(),
  '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
  s.id,
  cp.id,
  'confirmed',
  case when s.rn % 11 = 0 then 'pending' else 'paid' end,
  case when s.rn % 4 = 0 then 'transfer' else 'card' end,
  jsonb_build_object('source', 'demo_seed', 'bundle', true, 'student_name', s.name),
  now() - (s.rn % 30) * interval '1 day',
  now() - (s.rn % 60) * interval '1 day',
  now()
from active_students s
join class_pool cp on cp.idx = ((s.rn + 3 - 1) % 12) + 1
where s.rn % 4 = 0;

-- 7) Payments for the last 3 months
with enrollment_base as (
  select
    e.id as enrollment_id,
    e.student_id,
    e.payment_method,
    s.name as student_name,
    c.price_cents,
    row_number() over(order by e.created_at, e.id) as rn
  from enrollments e
  join students s on s.id = e.student_id
  join classes c on c.id = e.class_id
  where e.tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d'
    and e.status = 'confirmed'
),
periods as (
  select 2 as offset_month union all
  select 1 as offset_month union all
  select 0 as offset_month
)
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
select
  gen_random_uuid(),
  '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
  eb.enrollment_id,
  eb.student_id,
  eb.price_cents,
  'EUR',
  case
    when p.offset_month = 0 and eb.rn % 10 = 0 then 'overdue'
    when p.offset_month = 0 and eb.rn % 6 = 0 then 'pending'
    else 'paid'
  end,
  case
    when eb.payment_method = 'transfer' then 'transfer'
    when eb.payment_method = 'cash' then 'cash'
    else 'card'
  end,
  case
    when p.offset_month = 0 and eb.rn % 10 = 0 then null
    when p.offset_month = 0 and eb.rn % 6 = 0 then null
    else (date_trunc('month', now()) - (p.offset_month || ' month')::interval + interval '6 day')
  end,
  (date_trunc('month', now()) - (p.offset_month || ' month')::interval + interval '5 day'),
  jsonb_build_object(
    'month', to_char(date_trunc('month', now()) - (p.offset_month || ' month')::interval, 'YYYY-MM'),
    'payer_name', eb.student_name,
    'account_number', case when eb.payment_method = 'transfer' then 'ES' || lpad((1000000000 + eb.rn)::text, 20, '0') else null end
  ),
  now() - (p.offset_month * 30) * interval '1 day',
  now()
from enrollment_base eb
cross join periods p;

-- 8) Waitlist + offers
with waitlist_candidates as (
  select s.id, s.name, s.email, s.phone, row_number() over(order by s.created_at, s.id) as rn
  from students s
  where s.tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' and s.status = 'inactive'
  limit 18
),
class_pool as (
  select id, row_number() over(order by id) as idx
  from classes
  where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' and status = 'active'
)
insert into class_waitlist (
  id,
  tenant_id,
  class_id,
  status,
  priority,
  requested_at,
  offered_at,
  expires_at,
  contact_snapshot,
  metadata,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
  cp.id,
  case when wc.rn % 5 = 0 then 'offered' when wc.rn % 7 = 0 then 'cancelled' else 'pending' end,
  50 + wc.rn,
  now() - (wc.rn % 20) * interval '1 day',
  case when wc.rn % 5 = 0 then now() - (wc.rn % 5) * interval '1 day' else null end,
  case when wc.rn % 5 = 0 then now() + ((wc.rn % 4) + 1) * interval '1 day' else null end,
  jsonb_build_object('name', wc.name, 'email', wc.email, 'phone', wc.phone),
  jsonb_build_object('source', 'reception_demo', 'note', 'lead desde pagina publica'),
  now(),
  now()
from waitlist_candidates wc
join class_pool cp on cp.idx = ((wc.rn - 1) % 12) + 1;

insert into waitlist_offers (
  id,
  tenant_id,
  class_id,
  waitlist_id,
  status,
  offered_at,
  expires_at,
  responded_at,
  metadata,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  w.tenant_id,
  w.class_id,
  w.id,
  case when w.priority % 4 = 0 then 'sent' else 'queued' end,
  coalesce(w.offered_at, now()),
  coalesce(w.expires_at, now() + interval '2 day'),
  null,
  jsonb_build_object('channel', 'email_whatsapp'),
  now(),
  now()
from class_waitlist w
where w.tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d'
  and w.status = 'offered';

-- 9) Renewals + clone jobs
insert into renewal_campaigns (
  id,
  tenant_id,
  name,
  from_period,
  to_period,
  status,
  expires_at,
  metadata,
  created_at,
  updated_at
)
values
  (
    '70d5f9d8-37d8-4f2d-9e0d-39a0f1e22001',
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    'Renovacion Primavera',
    to_char(date_trunc('month', now()) - interval '1 month', 'YYYY-MM'),
    to_char(date_trunc('month', now()) + interval '1 month', 'YYYY-MM'),
    'active',
    now() + interval '20 day',
    jsonb_build_object('channel', 'portal+manual', 'target_students', 120),
    now(),
    now()
  ),
  (
    '70d5f9d8-37d8-4f2d-9e0d-39a0f1e22002',
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    'Renovacion Enero',
    to_char(date_trunc('month', now()) - interval '3 month', 'YYYY-MM'),
    to_char(date_trunc('month', now()) - interval '1 month', 'YYYY-MM'),
    'closed',
    now() - interval '25 day',
    jsonb_build_object('historic', true),
    now() - interval '60 day',
    now() - interval '20 day'
  );

with offer_source as (
  select
    s.id as student_id,
    row_number() over(order by s.created_at, s.id) as rn,
    array_agg(e.class_id order by e.class_id) as class_ids
  from students s
  join enrollments e on e.student_id = s.id and e.status = 'confirmed'
  where s.tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' and s.status = 'active'
  group by s.id
  order by min(s.created_at)
  limit 120
)
insert into renewal_offers (
  id,
  tenant_id,
  campaign_id,
  student_id,
  current_class_ids,
  proposed_class_ids,
  status,
  expires_at,
  responded_at,
  metadata,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
  '70d5f9d8-37d8-4f2d-9e0d-39a0f1e22001',
  os.student_id,
  os.class_ids,
  os.class_ids,
  case
    when os.rn % 8 = 0 then 'released'
    when os.rn % 5 = 0 then 'changed'
    when os.rn % 3 = 0 then 'confirmed'
    else 'pending'
  end,
  now() + interval '20 day',
  case when os.rn % 3 = 0 then now() - (os.rn % 10) * interval '1 day' else null end,
  jsonb_build_object('auto_generated', true),
  now() - (os.rn % 20) * interval '1 day',
  now()
from offer_source os;

insert into clone_jobs (
  id,
  tenant_id,
  source_period,
  target_period,
  status,
  options_json,
  summary_json,
  created_at,
  updated_at
)
values
  (
    gen_random_uuid(),
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    to_char(date_trunc('month', now()) - interval '2 month', 'YYYY-MM'),
    to_char(date_trunc('month', now()) - interval '1 month', 'YYYY-MM'),
    'completed',
    jsonb_build_object('copySchedules', true),
    jsonb_build_object('classesCreated', 12, 'schedulesCreated', 19),
    now() - interval '45 day',
    now() - interval '45 day'
  ),
  (
    gen_random_uuid(),
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    to_char(date_trunc('month', now()) - interval '1 month', 'YYYY-MM'),
    to_char(date_trunc('month', now()), 'YYYY-MM'),
    'completed',
    jsonb_build_object('copySchedules', true),
    jsonb_build_object('classesCreated', 12, 'schedulesCreated', 19),
    now() - interval '15 day',
    now() - interval '15 day'
  ),
  (
    gen_random_uuid(),
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    to_char(date_trunc('month', now()), 'YYYY-MM'),
    to_char(date_trunc('month', now()) + interval '1 month', 'YYYY-MM'),
    'queued',
    jsonb_build_object('copySchedules', true),
    '{}'::jsonb,
    now() - interval '1 day',
    now() - interval '1 day'
  );

-- 10) Events data for rich module walkthrough
insert into events (
  id,
  tenant_id,
  name,
  start_date,
  end_date,
  location,
  description,
  ticket_price_cents,
  capacity,
  status,
  created_at,
  updated_at
)
values
  (
    '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001',
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    'Festival Primavera 2026',
    (current_date + interval '20 day')::date,
    (current_date + interval '20 day')::date,
    'Teatro Norte Madrid',
    'Muestra de grupos kids, teens y pro.',
    1800,
    420,
    'published',
    now(),
    now()
  ),
  (
    '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3002',
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    'Intensivo Verano Heels',
    (current_date + interval '45 day')::date,
    (current_date + interval '47 day')::date,
    'Studio Principal',
    'Bootcamp de 3 dias para nivel intermedio y pro.',
    6900,
    60,
    'published',
    now(),
    now()
  ),
  (
    '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3003',
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    'Open Day Septiembre',
    (current_date + interval '75 day')::date,
    (current_date + interval '75 day')::date,
    'Escuela Demo DanceHub',
    'Jornada de puertas abiertas para nuevas matriculas.',
    null,
    300,
    'draft',
    now(),
    now()
  );

insert into event_sessions (
  id,
  event_id,
  tenant_id,
  date,
  start_time,
  end_time,
  name,
  notes,
  position,
  created_at,
  updated_at
)
values
  (
    '9a3dc2dd-9b78-4b53-a80c-8deef49b4001',
    '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001',
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    (current_date + interval '20 day')::date,
    '17:30:00',
    '19:15:00',
    'Bloque Kids',
    'Apertura familias',
    1,
    now(),
    now()
  ),
  (
    '9a3dc2dd-9b78-4b53-a80c-8deef49b4002',
    '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001',
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    (current_date + interval '20 day')::date,
    '19:45:00',
    '21:30:00',
    'Bloque Teens + Pro',
    'Cierre con premiacion interna',
    2,
    now(),
    now()
  ),
  (
    '9a3dc2dd-9b78-4b53-a80c-8deef49b4003',
    '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3002',
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    (current_date + interval '45 day')::date,
    '10:00:00',
    '13:30:00',
    'Dia 1 Tecnica',
    null,
    1,
    now(),
    now()
  ),
  (
    '9a3dc2dd-9b78-4b53-a80c-8deef49b4004',
    '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3002',
    '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d',
    (current_date + interval '46 day')::date,
    '10:00:00',
    '13:30:00',
    'Dia 2 Coreografia',
    null,
    2,
    now(),
    now()
  );

insert into event_schedule_items (
  id,
  session_id,
  event_id,
  tenant_id,
  position,
  start_time,
  duration_minutes,
  group_name,
  choreography,
  teacher_id,
  participants_count,
  room_id,
  notes,
  created_at,
  updated_at
)
values
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4001', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 1, '17:35:00', 12, 'Ballet Kids A', 'Mini Variaciones', 'a6fd4fe8-2997-4f44-ae08-3e41daedb001', 16, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', null, now(), now()),
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4001', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 2, '17:50:00', 10, 'Jazz Teens', 'Rhythm City', 'a6fd4fe8-2997-4f44-ae08-3e41daedb005', 14, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f002', null, now(), now()),
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4001', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 3, '18:05:00', 13, 'Hip Hop Teens', 'No Limits', 'a6fd4fe8-2997-4f44-ae08-3e41daedb002', 18, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', null, now(), now()),
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4002', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 1, '19:50:00', 14, 'Contemporaneo Pro', 'Pulse', 'a6fd4fe8-2997-4f44-ae08-3e41daedb003', 12, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', null, now(), now()),
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4002', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 2, '20:08:00', 12, 'Heels Pro Team', 'Spotlight', 'a6fd4fe8-2997-4f44-ae08-3e41daedb006', 10, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', null, now(), now()),
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4002', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 3, '20:25:00', 15, 'Ballet Adultos Intermedio', 'Suite Demo', 'a6fd4fe8-2997-4f44-ae08-3e41daedb001', 20, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f001', null, now(), now()),
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4003', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 1, '10:05:00', 45, 'Bloque tecnica base', null, 'a6fd4fe8-2997-4f44-ae08-3e41daedb006', 22, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', null, now(), now()),
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4003', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 2, '11:05:00', 60, 'Laboratorio coreografico', null, 'a6fd4fe8-2997-4f44-ae08-3e41daedb006', 22, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', null, now(), now()),
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4004', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 1, '10:05:00', 70, 'Ensayo por bloques', null, 'a6fd4fe8-2997-4f44-ae08-3e41daedb006', 22, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', null, now(), now()),
  (gen_random_uuid(), '9a3dc2dd-9b78-4b53-a80c-8deef49b4004', '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 2, '11:25:00', 60, 'Grabacion final', null, 'a6fd4fe8-2997-4f44-ae08-3e41daedb006', 22, 'b4de38dc-a29d-40b0-9a0a-53f6c3a2f003', null, now(), now());

insert into event_resources (
  id,
  event_id,
  tenant_id,
  type,
  name,
  created_at,
  updated_at
)
values
  (gen_random_uuid(), '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'room', 'Escenario principal', now(), now()),
  (gen_random_uuid(), '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3001', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'dressing_room', 'Camerino A', now(), now()),
  (gen_random_uuid(), '8f2eb4ac-6eb6-41f4-b4ef-3e8cc3db3002', '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d', 'room', 'Studio urbana', now(), now());

commit;

-- Verification quick checks
-- select count(*) as students_total from students where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
-- select status, count(*) from students where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' group by status;
-- select count(*) as enrollments_total from enrollments where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
-- select status, count(*) from payments where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d' group by status;
-- select count(*) as waitlist_total from class_waitlist where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
-- select count(*) as renewal_offers_total from renewal_offers where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';
-- select count(*) as events_total from events where tenant_id = '6b8f58d4-5c83-42cf-a671-31b8c5b93e5d';