-- ============================================================================
-- ExamSuite module: exams, exam_candidates
-- ============================================================================

-- ENUM: exam status
DO $$ BEGIN
  CREATE TYPE exam_status AS ENUM (
    'draft',
    'registration_open',
    'closed',
    'grading',
    'finished'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ENUM: exam candidate status
DO $$ BEGIN
  CREATE TYPE exam_candidate_status AS ENUM (
    'registered',
    'graded',
    'certified',
    'absent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table: exams
CREATE TABLE IF NOT EXISTS exams (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  discipline              TEXT NOT NULL,
  level                   TEXT NOT NULL,
  category                TEXT DEFAULT NULL,
  exam_date               DATE NOT NULL,
  registration_open_date  DATE NOT NULL,
  registration_close_date DATE NOT NULL,
  max_candidates          INTEGER DEFAULT NULL,
  status                  exam_status NOT NULL DEFAULT 'draft',
  grading_categories      JSONB NOT NULL DEFAULT '[]',
  certificate_template    TEXT DEFAULT NULL,
  created_by              UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT now(),
  updated_at              TIMESTAMP NOT NULL DEFAULT now()
);

-- Table: exam_candidates
CREATE TABLE IF NOT EXISTS exam_candidates (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id               UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  registration_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status                exam_candidate_status NOT NULL DEFAULT 'registered',
  grades                JSONB NOT NULL DEFAULT '{}',
  final_grade           NUMERIC(5, 2) DEFAULT NULL,
  certificate_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

-- ============================================================================
-- INDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_exams_tenant_id
  ON exams(tenant_id);

CREATE INDEX IF NOT EXISTS idx_exams_status
  ON exams(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_exams_exam_date
  ON exams(tenant_id, exam_date);

CREATE INDEX IF NOT EXISTS idx_exam_candidates_exam_id
  ON exam_candidates(exam_id);

CREATE INDEX IF NOT EXISTS idx_exam_candidates_tenant_id
  ON exam_candidates(tenant_id);

CREATE INDEX IF NOT EXISTS idx_exam_candidates_student_id
  ON exam_candidates(student_id);

CREATE INDEX IF NOT EXISTS idx_exam_candidates_status
  ON exam_candidates(exam_id, status);

-- ============================================================================
-- updated_at TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_exams_updated_at ON exams;
CREATE TRIGGER set_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_exam_candidates_updated_at ON exam_candidates;
CREATE TRIGGER set_exam_candidates_updated_at
  BEFORE UPDATE ON exam_candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_candidates ENABLE ROW LEVEL SECURITY;

-- exams RLS
DROP POLICY IF EXISTS "Tenant users can read exams" ON exams;
CREATE POLICY "Tenant users can read exams" ON exams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.tenant_id = exams.tenant_id
    )
  );

DROP POLICY IF EXISTS "Tenant users can insert exams" ON exams;
CREATE POLICY "Tenant users can insert exams" ON exams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.tenant_id = exams.tenant_id
    )
  );

DROP POLICY IF EXISTS "Tenant users can update exams" ON exams;
CREATE POLICY "Tenant users can update exams" ON exams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.tenant_id = exams.tenant_id
    )
  );

DROP POLICY IF EXISTS "Tenant users can delete exams" ON exams;
CREATE POLICY "Tenant users can delete exams" ON exams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.tenant_id = exams.tenant_id
    )
  );

-- exam_candidates RLS
DROP POLICY IF EXISTS "Tenant users can read exam_candidates" ON exam_candidates;
CREATE POLICY "Tenant users can read exam_candidates" ON exam_candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.tenant_id = exam_candidates.tenant_id
    )
  );

DROP POLICY IF EXISTS "Tenant users can insert exam_candidates" ON exam_candidates;
CREATE POLICY "Tenant users can insert exam_candidates" ON exam_candidates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.tenant_id = exam_candidates.tenant_id
    )
  );

DROP POLICY IF EXISTS "Tenant users can update exam_candidates" ON exam_candidates;
CREATE POLICY "Tenant users can update exam_candidates" ON exam_candidates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.tenant_id = exam_candidates.tenant_id
    )
  );

DROP POLICY IF EXISTS "Tenant users can delete exam_candidates" ON exam_candidates;
CREATE POLICY "Tenant users can delete exam_candidates" ON exam_candidates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.tenant_id = exam_candidates.tenant_id
    )
  );
