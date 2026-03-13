-- Allow duplicate student emails inside the same tenant.
-- Use this when families share the same email account.

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name
  INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'students'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name = 'email'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.students DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_tenant_email ON public.students (tenant_id, email);
