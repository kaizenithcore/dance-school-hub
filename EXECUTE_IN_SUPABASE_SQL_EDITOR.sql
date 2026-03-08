-- ## INSTRUCCIONES:
-- 1. Ve a https://supabase.com/dashboard
-- 2. Selecciona tu proyecto
-- 3. Abre el editor SQL (SQL Editor)
-- 4. Copia y pega TODO el contenido de este archivo
-- 5. Haz click en el botón "RUN"

-- ============================================================================
-- CREAR TABLAS PARA SISTEMA DE FACTURACIÓN
-- ============================================================================

-- Table: monthly_invoices
-- Almacena las facturas generadas por mes
CREATE TABLE IF NOT EXISTS monthly_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT NULL,
  paid_date TIMESTAMP DEFAULT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Table: monthly_invoice_items
-- Almacena los items (clases) de cada factura
CREATE TABLE IF NOT EXISTS monthly_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES monthly_invoices(id) ON DELETE CASCADE,
  class_id UUID DEFAULT NULL REFERENCES classes(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- CREAR INDICES PARA MEJOR RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_monthly_invoices_tenant_id 
  ON monthly_invoices(tenant_id);

CREATE INDEX IF NOT EXISTS idx_monthly_invoices_student_id 
  ON monthly_invoices(student_id);

CREATE INDEX IF NOT EXISTS idx_monthly_invoices_month 
  ON monthly_invoices(month);

CREATE INDEX IF NOT EXISTS idx_monthly_invoices_status 
  ON monthly_invoices(status);

CREATE INDEX IF NOT EXISTS idx_monthly_invoices_tenant_student_month 
  ON monthly_invoices(tenant_id, student_id, month);

CREATE INDEX IF NOT EXISTS idx_monthly_invoice_items_invoice_id 
  ON monthly_invoice_items(invoice_id);

-- ============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE monthly_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_invoice_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREAR POLÍTICAS RLS PARA monthly_invoices
-- ============================================================================

DROP POLICY IF EXISTS "Enable read for tenant users" ON monthly_invoices;
CREATE POLICY "Enable read for tenant users" ON monthly_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.tenant_id = monthly_invoices.tenant_id
    )
  );

DROP POLICY IF EXISTS "Enable insert for tenant users" ON monthly_invoices;
CREATE POLICY "Enable insert for tenant users" ON monthly_invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.tenant_id = monthly_invoices.tenant_id
    )
  );

DROP POLICY IF EXISTS "Enable update for tenant users" ON monthly_invoices;
CREATE POLICY "Enable update for tenant users" ON monthly_invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.tenant_id = monthly_invoices.tenant_id
    )
  );

-- ============================================================================
-- CREAR POLÍTICAS RLS PARA monthly_invoice_items
-- ============================================================================

DROP POLICY IF EXISTS "Enable read for tenant users" ON monthly_invoice_items;
CREATE POLICY "Enable read for tenant users" ON monthly_invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN monthly_invoices mi ON mi.tenant_id = u.tenant_id
      WHERE u.id = auth.uid() 
      AND mi.id = monthly_invoice_items.invoice_id
    )
  );

DROP POLICY IF EXISTS "Enable insert for tenant users" ON monthly_invoice_items;
CREATE POLICY "Enable insert for tenant users" ON monthly_invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN monthly_invoices mi ON mi.tenant_id = u.tenant_id
      WHERE u.id = auth.uid() 
      AND mi.id = monthly_invoice_items.invoice_id
    )
  );

DROP POLICY IF EXISTS "Enable update for tenant users" ON monthly_invoice_items;
CREATE POLICY "Enable update for tenant users" ON monthly_invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN monthly_invoices mi ON mi.tenant_id = u.tenant_id
      WHERE u.id = auth.uid() 
      AND mi.id = monthly_invoice_items.invoice_id
    )
  );
