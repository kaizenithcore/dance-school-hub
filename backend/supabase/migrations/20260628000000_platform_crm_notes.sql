-- Platform CRM notes — only accessible via supabaseAdmin (service role key)
-- No RLS needed: these rows are never exposed to end users or tenant queries.
CREATE TABLE IF NOT EXISTS public.platform_crm_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  note        TEXT,
  status      TEXT        NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new','contacted','active','at_risk','churned')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_crm_tenant
  ON public.platform_crm_notes(tenant_id, created_at DESC);
