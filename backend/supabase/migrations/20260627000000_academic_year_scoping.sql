-- ─────────────────────────────────────────────────────────────────────────────
-- Academic year scoping: add academic_year_id to classes and enrollments
--
-- Strategy:
--   • Column is nullable — NULL means "no year scope / legacy record"
--   • Backfill existing records with each tenant's current_academic_year_id
--   • Filtering: WHERE (academic_year_id = :yearId OR academic_year_id IS NULL)
--     shows current-year records + shared/legacy records
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add academic_year_id column to classes
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS academic_year_id UUID
    REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- 2. Add academic_year_id column to enrollments
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS academic_year_id UUID
    REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- 3. Indexes for performant filtering
CREATE INDEX IF NOT EXISTS idx_classes_tenant_year
  ON public.classes(tenant_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_tenant_year
  ON public.enrollments(tenant_id, academic_year_id);

-- 4. Backfill: assign existing classes to the tenant's current academic year
UPDATE public.classes c
SET    academic_year_id = ss.current_academic_year_id
FROM   public.school_settings ss
WHERE  ss.tenant_id = c.tenant_id
  AND  ss.current_academic_year_id IS NOT NULL
  AND  c.academic_year_id IS NULL;

-- 5. Backfill: assign existing enrollments to the tenant's current academic year
UPDATE public.enrollments e
SET    academic_year_id = ss.current_academic_year_id
FROM   public.school_settings ss
WHERE  ss.tenant_id = e.tenant_id
  AND  ss.current_academic_year_id IS NOT NULL
  AND  e.academic_year_id IS NULL;
