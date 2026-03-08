// Pricing Rules System Types

export type RuleType =
  | 'discipline_hours'    // Price based on specific discipline + hours
  | 'category_pack'       // Price based on hours across a category
  | 'total_hours'         // Price based on total hours
  | 'fixed_discount'      // Fixed discount amount
  | 'percentage_discount' // Percentage discount

// Discipline Category
export interface DisciplineCategory {
  id: string
  tenant_id: string
  name: string
  slug: string
  description?: string
  discipline_ids: string[]
  is_bonus_eligible: boolean
  color?: string
  created_at: string
  updated_at: string
}

// Condition types for different rule types
export interface DisciplineHoursCondition {
  discipline_id: string
  hours_min: number
  hours_max: number
}

export interface CategoryPackCondition {
  category_slug: string
  hours_min: number
  hours_max: number
}

export interface TotalHoursCondition {
  hours_min: number
  hours_max: number
  included_categories?: string[] // If specified, only count hours from these categories
  excluded_disciplines?: string[] // Disciplines that don't count (e.g., Piano, Canto)
}

export type RuleConditions =
  | DisciplineHoursCondition
  | CategoryPackCondition
  | TotalHoursCondition

// Pricing Rule
export interface PricingRule {
  id: string
  tenant_id: string
  name: string
  description?: string
  rule_type: RuleType
  conditions: RuleConditions
  price?: number // For fixed price rules
  discount_amount?: number // For fixed_discount
  discount_percentage?: number // For percentage_discount
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Input for pricing calculation
export interface ClassSelection {
  class_id: string
  discipline_id: string
  discipline_name: string
  hours_per_week: number
  base_price: number
}

// Result of pricing calculation
export interface PricingCalculation {
  total: number
  subtotal: number
  discount: number
  breakdown: PricingBreakdownItem[]
  applied_rules: AppliedRule[]
}

export interface PricingBreakdownItem {
  type: 'class' | 'pack' | 'discount'
  description: string
  quantity?: number
  unit_price?: number
  total: number
  class_ids?: string[] // Which classes this item covers
}

export interface AppliedRule {
  rule_id: string
  rule_name: string
  rule_type: RuleType
  description: string
  amount: number // Positive for pricing, negative for discounts
  class_ids: string[] // Which classes this rule applies to
}
