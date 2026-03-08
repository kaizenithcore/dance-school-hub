-- Pricing Rules System
-- This migration creates tables for flexible pricing rules and bonuses

-- Table for discipline categories (for grouping disciplines)
CREATE TABLE discipline_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Category identification
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  
  -- Which disciplines belong to this category
  discipline_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  
  -- Configuration
  is_bonus_eligible BOOLEAN DEFAULT true, -- If false, disciplines don't count toward bonuses
  color TEXT, -- For UI display
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, slug)
);

-- Table for pricing rules
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'discipline_hours',    -- Price based on specific discipline + hours
    'category_pack',       -- Price based on hours across a category
    'total_hours',         -- Price based on total hours
    'fixed_discount',      -- Fixed discount amount
    'percentage_discount'  -- Percentage discount
  )),
  
  -- Rule conditions (JSONB for flexibility)
  conditions JSONB NOT NULL,
  -- Examples:
  -- discipline_hours: { "discipline_id": "uuid", "hours_min": 2, "hours_max": 2 }
  -- category_pack: { "category_slug": "dance", "hours_min": 4, "hours_max": 4 }
  -- total_hours: { "hours_min": 3, "hours_max": 5, "included_categories": ["dance", "wellness"] }
  
  -- Pricing
  price DECIMAL(10,2), -- For fixed price rules (discipline_hours, category_pack, total_hours)
  discount_amount DECIMAL(10,2), -- For fixed_discount
  discount_percentage INTEGER, -- For percentage_discount
  
  -- Rule application
  priority INTEGER DEFAULT 0, -- Higher priority = applied first
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pricing_rules_tenant ON pricing_rules(tenant_id);
CREATE INDEX idx_pricing_rules_type ON pricing_rules(rule_type);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_discipline_categories_tenant ON discipline_categories(tenant_id);

-- RLS policies
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipline_categories ENABLE ROW LEVEL SECURITY;

-- Read access for tenant members
CREATE POLICY pricing_rules_read ON pricing_rules
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid()
    )
  );

-- Write access for admins/owners
CREATE POLICY pricing_rules_write ON pricing_rules
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY discipline_categories_read ON discipline_categories
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY discipline_categories_write ON discipline_categories
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
