-- Create monthly_invoices table
CREATE TABLE IF NOT EXISTS monthly_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: "2026-03"
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue
  total_amount_cents INTEGER NOT NULL,
  payment_method TEXT, -- efectivo, transferencia, etc.
  paid_date TIMESTAMP,
  invoice_number TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'overdue')),
  CONSTRAINT valid_month FORMAT (month ~ '^\d{4}-\d{2}$')
);

-- Create monthly_invoice_items table
CREATE TABLE IF NOT EXISTS monthly_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES monthly_invoices(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT positive_amount CHECK (amount_cents > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_tenant_id ON monthly_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_student_id ON monthly_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_month ON monthly_invoices(month);
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_status ON monthly_invoices(status);
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_tenant_student_month ON monthly_invoices(tenant_id, student_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_invoice_items_invoice_id ON monthly_invoice_items(invoice_id);

-- Enable RLS (Row Level Security)
ALTER TABLE monthly_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_invoice_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for monthly_invoices
CREATE POLICY "Enable read access for users in tenant" ON monthly_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.tenant_id = monthly_invoices.tenant_id
    )
  );

CREATE POLICY "Enable insert access for users in tenant" ON monthly_invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.tenant_id = monthly_invoices.tenant_id
    )
  );

CREATE POLICY "Enable update access for users in tenant" ON monthly_invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.tenant_id = monthly_invoices.tenant_id
    )
  );

-- Create RLS policies for monthly_invoice_items (inherit from invoice)
CREATE POLICY "Enable read access for users in tenant" ON monthly_invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.monthly_invoices mi ON mi.tenant_id = u.tenant_id
      WHERE u.id = auth.uid() AND mi.id = monthly_invoice_items.invoice_id
    )
  );

CREATE POLICY "Enable insert access for users in tenant" ON monthly_invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.monthly_invoices mi ON mi.tenant_id = u.tenant_id
      WHERE u.id = auth.uid() AND mi.id = monthly_invoice_items.invoice_id
    )
  );

CREATE POLICY "Enable update access for users in tenant" ON monthly_invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.monthly_invoices mi ON mi.tenant_id = u.tenant_id
      WHERE u.id = auth.uid() AND mi.id = monthly_invoice_items.invoice_id
    )
  );
