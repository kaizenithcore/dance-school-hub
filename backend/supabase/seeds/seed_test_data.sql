-- Sprint 3: Seed data for development and testing
-- Tenant: Escuela de Prueba (a157c330-a83f-4962-b61f-36cf4b1e1726)

BEGIN;

-- Insert Teachers
INSERT INTO teachers (id, tenant_id, name, email, phone, bio, status, created_at, updated_at)
VALUES
  (
    'c1e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b3',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Laura Martínez',
    'laura@escuela-prueba.com',
    '+34 666 111 222',
    'Profesora de ballet clásico con 15 años de experiencia. Especializada en técnica clásica y contemporáneo.',
    'active',
    NOW(),
    NOW()
  ),
  (
    'c2e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b4',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Carlos Ramírez',
    'carlos@escuela-prueba.com',
    '+34 666 333 444',
    'Instructor de salsa y bachata. Campeón nacional de baile latino 2023.',
    'active',
    NOW(),
    NOW()
  ),
  (
    'd3e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b5',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Ana Fernández',
    'ana@escuela-prueba.com',
    '+34 666 555 666',
    'Profesora de hip hop y danza urbana. Coreógrafa profesional.',
    'active',
    NOW(),
    NOW()
  ),
  (
    'e4e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b6',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Miguel Torres',
    'miguel@escuela-prueba.com',
    '+34 666 777 888',
    'Especialista en danza contemporánea y expresión corporal. Graduado del Real Conservatorio.',
    'active',
    NOW(),
    NOW()
  );

-- Insert Rooms
INSERT INTO rooms (id, tenant_id, name, capacity, description, is_active, created_at, updated_at)
VALUES
  (
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Sala Principal',
    25,
    'Sala amplia con espejos de pared completa, suelo de madera y barra de ballet.',
    true,
    NOW(),
    NOW()
  ),
  (
    'f6e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b8',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Sala 2',
    15,
    'Sala mediana perfecta para clases reducidas.',
    true,
    NOW(),
    NOW()
  ),
  (
    'f7e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b9',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Sala 3 - Estudio',
    12,
    'Estudio íntimo ideal para clases personalizadas y ensayos.',
    true,
    NOW(),
    NOW()
  );

-- Insert Classes
INSERT INTO classes (id, tenant_id, name, discipline, category, teacher_id, room_id, capacity, price_cents, description, status, created_at, updated_at)
VALUES
  (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Ballet Clásico Iniciación',
    'Ballet',
    'Adultos',
    'c1e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b3',
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    20,
    5000,
    'Clase de ballet clásico para principiantes adultos. Se trabaja técnica básica, postura y primeros pasos de danza.',
    'active',
    NOW(),
    NOW()
  ),
  (
    'a2b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Ballet Clásico Avanzado',
    'Ballet',
    'Adultos',
    'c1e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b3',
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    15,
    6000,
    'Clase avanzada de ballet clásico con coreografías complejas y técnica refinada.',
    'active',
    NOW(),
    NOW()
  ),
  (
    'a3b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5f',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Salsa y Bachata',
    'Latino',
    'Adultos',
    'c2e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b4',
    'f6e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b8',
    18,
    4500,
    'Aprende los ritmos latinos más populares. Salsa cubana, en línea y bachata dominicana.',
    'active',
    NOW(),
    NOW()
  ),
  (
    'a4b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c60',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Hip Hop Urbano',
    'Hip Hop',
    'Jóvenes',
    'd3e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b5',
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    20,
    4000,
    'Clase de hip hop urbano con los últimos estilos de street dance, popping y locking.',
    'active',
    NOW(),
    NOW()
  ),
  (
    'a5b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c61',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Contemporáneo',
    'Contemporáneo',
    'Adultos',
    'e4e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b6',
    'f7e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b9',
    12,
    5500,
    'Explora la expresión corporal y la danza contemporánea. Conecta con tu creatividad.',
    'active',
    NOW(),
    NOW()
  ),
  (
    'a6b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c62',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'Ballet Infantil',
    'Ballet',
    'Niños',
    'c1e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b3',
    'f6e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b8',
    15,
    3500,
    'Ballet para niños de 6 a 12 años. Aprenden técnica básica de forma divertida y lúdica.',
    'active',
    NOW(),
    NOW()
  );

-- Insert Class Schedules
INSERT INTO class_schedules (id, tenant_id, class_id, room_id, weekday, start_time, end_time, effective_from, is_active, created_at, updated_at)
VALUES
  -- Ballet Clásico Iniciación: Martes y Jueves 18:00-19:30
  (
    'b1c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5e',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    2,
    '18:00:00',
    '19:30:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  ),
  (
    'b2c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d5f',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    4,
    '18:00:00',
    '19:30:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  ),
  -- Ballet Avanzado: Lunes y Miércoles 20:00-21:30
  (
    'b3c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d60',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a2b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e',
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    1,
    '20:00:00',
    '21:30:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  ),
  (
    'b4c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d61',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a2b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5e',
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    3,
    '20:00:00',
    '21:30:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  ),
  -- Salsa y Bachata: Viernes 19:00-21:00
  (
    'b5c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d62',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a3b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5f',
    'f6e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b8',
    5,
    '19:00:00',
    '21:00:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  ),
  -- Hip Hop: Martes y Jueves 17:00-18:00
  (
    'b6c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d63',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a4b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c60',
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    2,
    '17:00:00',
    '18:00:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  ),
  (
    'b7c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d64',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a4b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c60',
    'f5e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b7',
    4,
    '17:00:00',
    '18:00:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  ),
  -- Contemporáneo: Miércoles 19:00-20:30
  (
    'b8c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d65',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a5b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c61',
    'f7e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b9',
    3,
    '19:00:00',
    '20:30:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  ),
  -- Ballet Infantil: Lunes y Viernes 17:00-18:00
  (
    'b9c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d66',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a6b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c62',
    'f6e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b8',
    1,
    '17:00:00',
    '18:00:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  ),
  (
    'b0c2d3e4-f5a6-4b5c-8d9e-0f1a2b3c4d67',
    'a157c330-a83f-4962-b61f-36cf4b1e1726',
    'a6b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c62',
    'f6e8a5b2-3f4d-4e5f-a6b7-c8d9e0f1a2b8',
    5,
    '17:00:00',
    '18:00:00',
    '2026-03-01',
    true,
    NOW(),
    NOW()
  );

COMMIT;

-- Verification queries
-- SELECT * FROM teachers WHERE tenant_id = 'a157c330-a83f-4962-b61f-36cf4b1e1726';
-- SELECT * FROM rooms WHERE tenant_id = 'a157c330-a83f-4962-b61f-36cf4b1e1726';
-- SELECT * FROM classes WHERE tenant_id = 'a157c330-a83f-4962-b61f-36cf4b1e1726';
-- SELECT * FROM class_schedules WHERE tenant_id = 'a157c330-a83f-4962-b61f-36cf4b1e1726';
