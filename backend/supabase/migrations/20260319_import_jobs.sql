-- Sprint 8: Importador inteligente de alumnos
-- Table to track student import jobs for audit and result display

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'students',
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  created_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  mapping_json JSONB,
  result_json JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Owners and admins of the tenant can read their import jobs
CREATE POLICY "import_jobs_tenant_select" ON import_jobs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid()
    )
  );
