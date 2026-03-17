-- Purga de datos para preparacion de produccion
-- Contexto: todos los tenants actuales son de pruebas y seran eliminados.
--
-- Ejecutar en Supabase SQL Editor.
-- Este script NO elimina estructura (tablas, indices, policies).
-- Solo elimina datos en el esquema public.
--
-- Importante:
-- 1) Mantiene tablas de extensiones PostGIS si existen.
-- 2) No elimina usuarios de auth por defecto (bloque opcional al final).
-- 3) Si quieres limpiar archivos subidos, habilita bloque opcional de storage.objects.

begin;

-- Trunca todas las tablas de negocio del esquema public.
do $$
declare
  truncate_sql text;
begin
  select 'truncate table '
    || string_agg(format('%I.%I', schemaname, tablename), ', ')
    || ' restart identity cascade'
  into truncate_sql
  from pg_tables
  where schemaname = 'public'
    and tablename not in (
      -- Tablas de PostGIS/extension que no deben tocarse
      'spatial_ref_sys',
      'geometry_columns',
      'geography_columns',
      'raster_columns',
      'raster_overviews'
    );

  if truncate_sql is not null then
    execute truncate_sql;
  end if;
end $$;

commit;

-- ---------------------------------------------------------------------------
-- OPCIONAL 1: limpiar archivos en Storage (descomenta si aplica)
-- ---------------------------------------------------------------------------
-- delete from storage.objects;

-- ---------------------------------------------------------------------------
-- OPCIONAL 2: eliminar usuarios de Auth sin membresias (descomenta si aplica)
-- ---------------------------------------------------------------------------
-- delete from auth.users u
-- where not exists (
--   select 1
--   from public.tenant_memberships tm
--   where tm.user_id = u.id
-- );
