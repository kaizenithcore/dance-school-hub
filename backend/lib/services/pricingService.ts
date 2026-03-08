import { supabaseAdmin } from '../db/supabaseAdmin'
import type {
  PricingRule,
  DisciplineCategory,
  ClassSelection,
  PricingCalculation,
  PricingBreakdownItem,
  AppliedRule,
  DisciplineHoursCondition,
  CategoryPackCondition,
  TotalHoursCondition,
} from '../types/pricing'

export const pricingService = {
  isMissingPricingTable(message: string) {
    return message.includes('pricing_rules') || message.includes('discipline_categories')
  },

  async getFallbackPricingData(tenantId: string): Promise<{ rules: PricingRule[]; categories: DisciplineCategory[] }> {
    const { data: settings, error } = await supabaseAdmin
      .from('school_settings')
      .select('enrollment_config')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) throw error

    const enrollmentConfig = settings?.enrollment_config && typeof settings.enrollment_config === 'object'
      ? (settings.enrollment_config as Record<string, unknown>)
      : {}

    const pricing = enrollmentConfig.pricing && typeof enrollmentConfig.pricing === 'object'
      ? (enrollmentConfig.pricing as Record<string, unknown>)
      : {}

    return {
      rules: Array.isArray(pricing.rules) ? (pricing.rules as PricingRule[]) : [],
      categories: Array.isArray(pricing.categories) ? (pricing.categories as DisciplineCategory[]) : [],
    }
  },

  async saveFallbackPricingData(tenantId: string, rules: PricingRule[], categories: DisciplineCategory[]): Promise<void> {
    const { data: settings, error: readError } = await supabaseAdmin
      .from('school_settings')
      .select('id, enrollment_config')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (readError) throw readError

    const enrollmentConfig = settings?.enrollment_config && typeof settings.enrollment_config === 'object'
      ? (settings.enrollment_config as Record<string, unknown>)
      : {}

    const merged = {
      ...enrollmentConfig,
      pricing: { rules, categories },
    }

    if (settings?.id) {
      const { error: updateError } = await supabaseAdmin
        .from('school_settings')
        .update({ enrollment_config: merged })
        .eq('id', settings.id)

      if (updateError) throw updateError
      return
    }

    const { error: insertError } = await supabaseAdmin
      .from('school_settings')
      .insert({ tenant_id: tenantId, enrollment_config: merged })

    if (insertError) throw insertError
  },

  /**
   * Calculate optimal pricing for a set of selected classes
   */
  async calculatePricing(
    tenantId: string,
    classes: ClassSelection[]
  ): Promise<PricingCalculation> {
    // Load pricing rules and categories
    const [rules, categories] = await Promise.all([
      this.getActivePricingRules(tenantId),
      this.getDisciplineCategories(tenantId),
    ])

    // Build category map for quick lookup
    const categoryMap = this.buildCategoryMap(categories)
    const wildcardCategories = categories
      .filter((category) => !category.discipline_ids || category.discipline_ids.length === 0)
      .map((category) => category.slug)

    // Enrich classes with category information
    const enrichedClasses = classes.map((cls) => ({
      ...cls,
      categories: Array.from(new Set([...(categoryMap.get(cls.discipline_id) || []), ...wildcardCategories])),
    }))

    // Try to find the best pricing combination
    const result = this.findOptimalPricing(enrichedClasses, rules, categories)

    return result
  },

  /**
   * Get all active pricing rules for a tenant
   */
  async getActivePricingRules(tenantId: string): Promise<PricingRule[]> {
    const { data, error } = await supabaseAdmin
      .from('pricing_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) {
      if (this.isMissingPricingTable(error.message)) {
        const fallback = await this.getFallbackPricingData(tenantId)
        return fallback.rules.filter((rule) => rule.is_active).sort((a, b) => b.priority - a.priority)
      }
      throw error
    }
    return data as PricingRule[]
  },

  /**
   * Get all discipline categories for a tenant
   */
  async getDisciplineCategories(tenantId: string): Promise<DisciplineCategory[]> {
    const { data, error } = await supabaseAdmin
      .from('discipline_categories')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) {
      if (this.isMissingPricingTable(error.message)) {
        const fallback = await this.getFallbackPricingData(tenantId)
        return fallback.categories
      }
      throw error
    }
    return data as DisciplineCategory[]
  },

  /**
   * Build a map from discipline_id to categories
   */
  buildCategoryMap(categories: DisciplineCategory[]): Map<string, string[]> {
    const map = new Map<string, string[]>()

    for (const category of categories) {
      for (const disciplineId of category.discipline_ids) {
        const existing = map.get(disciplineId) || []
        existing.push(category.slug)
        map.set(disciplineId, existing)
      }
    }

    return map
  },

  /**
   * Find the optimal pricing for the given classes
   */
  findOptimalPricing(
    classes: Array<ClassSelection & { categories: string[] }>,
    rules: PricingRule[],
    categories: DisciplineCategory[]
  ): PricingCalculation {
    // Group classes by category for pack bonuses
    const categoryGroups = this.groupClassesByCategory(classes)

    // Calculate total hours per category (only bonus-eligible)
    const categoryHours = new Map<string, number>()
    for (const [categorySlug, categoryClasses] of categoryGroups) {
      const category = categories.find((c: DisciplineCategory) => c.slug === categorySlug)
      if (category?.is_bonus_eligible) {
        const totalHours = categoryClasses.reduce((sum, cls) => sum + cls.hours_per_week, 0)
        categoryHours.set(categorySlug, totalHours)
      }
    }

    // Try different pricing strategies and pick the best one
    const strategies = [
      this.calculateWithCategoryPacks(classes, rules, categoryHours, categoryGroups),
      this.calculateWithTotalHours(classes, rules),
      this.calculateWithDisciplineHours(classes, rules),
      this.calculateBasePricing(classes),
    ]

    // Pick the strategy with the lowest total
    const bestStrategy = strategies.reduce((best, current) =>
      current.total < best.total ? current : best
    )

    return bestStrategy
  },

  /**
   * Group classes by category
   */
  groupClassesByCategory(
    classes: Array<ClassSelection & { categories: string[] }>
  ): Map<string, Array<ClassSelection & { categories: string[] }>> {
    const groups = new Map<string, Array<ClassSelection & { categories: string[] }>>()

    for (const cls of classes) {
      for (const categorySlug of cls.categories) {
        const existing = groups.get(categorySlug) || []
        existing.push(cls)
        groups.set(categorySlug, existing)
      }
    }

    return groups
  },

  calculateWithTotalHours(
    classes: Array<ClassSelection & { categories: string[] }>,
    rules: PricingRule[]
  ): PricingCalculation {
    const totalHoursRules = rules
      .filter((rule) => rule.rule_type === 'total_hours' && typeof rule.price === 'number')
      .sort((a, b) => b.priority - a.priority)

    if (totalHoursRules.length === 0) {
      return this.calculateBasePricing(classes)
    }

    const matchingRule = totalHoursRules.find((rule) => {
      const condition = rule.conditions as TotalHoursCondition
      const includedCategories = condition.included_categories || []
      const excludedDisciplines = condition.excluded_disciplines || []

      const scopedClasses = classes.filter((cls) => {
        if (excludedDisciplines.includes(cls.discipline_id)) {
          return false
        }
        if (includedCategories.length === 0) {
          return true
        }
        return cls.categories.some((category) => includedCategories.includes(category))
      })

      const scopedHours = scopedClasses.reduce((sum, cls) => sum + cls.hours_per_week, 0)
      return scopedHours >= condition.hours_min && scopedHours <= condition.hours_max
    })

    if (!matchingRule || typeof matchingRule.price !== 'number') {
      return this.calculateBasePricing(classes)
    }

    const classIds = classes.map((cls) => cls.class_id)
    return {
      total: matchingRule.price,
      subtotal: matchingRule.price,
      discount: 0,
      breakdown: [
        {
          type: 'pack',
          description: matchingRule.name,
          total: matchingRule.price,
          class_ids: classIds,
        },
      ],
      applied_rules: [
        {
          rule_id: matchingRule.id,
          rule_name: matchingRule.name,
          rule_type: matchingRule.rule_type,
          description: matchingRule.description || '',
          amount: matchingRule.price,
          class_ids: classIds,
        },
      ],
    }
  },

  /**
   * Calculate pricing using category pack bonuses
   */
  calculateWithCategoryPacks(
    classes: Array<ClassSelection & { categories: string[] }>,
    rules: PricingRule[],
    categoryHours: Map<string, number>,
    categoryGroups: Map<string, Array<ClassSelection & { categories: string[] }>>
  ): PricingCalculation {
    const breakdown: PricingBreakdownItem[] = []
    const appliedRules: AppliedRule[] = []
    const coveredClasses = new Set<string>()

    // Sort category pack rules by priority
    const categoryPackRules = rules
      .filter((r) => r.rule_type === 'category_pack')
      .sort((a, b) => b.priority - a.priority)

    // Try to apply category pack rules
    for (const [categorySlug, totalHours] of categoryHours) {
      const matchingRule = categoryPackRules.find((rule) => {
        const condition = rule.conditions as CategoryPackCondition
        return (
          condition.category_slug === categorySlug &&
          totalHours >= condition.hours_min &&
          totalHours <= condition.hours_max
        )
      })

      if (matchingRule && matchingRule.price !== undefined) {
        const categoryClasses = categoryGroups.get(categorySlug) || []
        const classIds = categoryClasses.map((c) => c.class_id)

        breakdown.push({
          type: 'pack',
          description: matchingRule.name,
          total: matchingRule.price,
          class_ids: classIds,
        })

        appliedRules.push({
          rule_id: matchingRule.id,
          rule_name: matchingRule.name,
          rule_type: matchingRule.rule_type,
          description: matchingRule.description || '',
          amount: matchingRule.price,
          class_ids: classIds,
        })

        // Mark these classes as covered
        classIds.forEach((id) => coveredClasses.add(id))
      }
    }

    // Add individual prices for uncovered classes
    for (const cls of classes) {
      if (!coveredClasses.has(cls.class_id)) {
        // Try to find a discipline_hours rule
        const disciplineRule = this.findDisciplineHoursRule(cls, rules)
        const price = disciplineRule?.price ?? cls.base_price

        breakdown.push({
          type: 'class',
          description: cls.discipline_name,
          quantity: 1,
          unit_price: price,
          total: price,
          class_ids: [cls.class_id],
        })

        if (disciplineRule) {
          appliedRules.push({
            rule_id: disciplineRule.id,
            rule_name: disciplineRule.name,
            rule_type: disciplineRule.rule_type,
            description: disciplineRule.description || '',
            amount: price,
            class_ids: [cls.class_id],
          })
        }
      }
    }

    const subtotal = breakdown.reduce((sum, item) => sum + item.total, 0)

    return {
      total: subtotal,
      subtotal,
      discount: 0,
      breakdown,
      applied_rules: appliedRules,
    }
  },

  /**
   * Calculate pricing using individual discipline hours rules
   */
  calculateWithDisciplineHours(
    classes: Array<ClassSelection & { categories: string[] }>,
    rules: PricingRule[]
  ): PricingCalculation {
    const breakdown: PricingBreakdownItem[] = []
    const appliedRules: AppliedRule[] = []

    const disciplineRules = rules.filter((r) => r.rule_type === 'discipline_hours')

    for (const cls of classes) {
      const matchingRule = this.findDisciplineHoursRule(cls, disciplineRules)
      const price = matchingRule?.price ?? cls.base_price

      breakdown.push({
        type: 'class',
        description: cls.discipline_name,
        quantity: 1,
        unit_price: price,
        total: price,
        class_ids: [cls.class_id],
      })

      if (matchingRule) {
        appliedRules.push({
          rule_id: matchingRule.id,
          rule_name: matchingRule.name,
          rule_type: matchingRule.rule_type,
          description: matchingRule.description || '',
          amount: price,
          class_ids: [cls.class_id],
        })
      }
    }

    const subtotal = breakdown.reduce((sum, item) => sum + item.total, 0)

    return {
      total: subtotal,
      subtotal,
      discount: 0,
      breakdown,
      applied_rules: appliedRules,
    }
  },

  /**
   * Calculate base pricing without any rules
   */
  calculateBasePricing(classes: ClassSelection[]): PricingCalculation {
    const breakdown: PricingBreakdownItem[] = classes.map((cls) => ({
      type: 'class',
      description: cls.discipline_name,
      quantity: 1,
      unit_price: cls.base_price,
      total: cls.base_price,
      class_ids: [cls.class_id],
    }))

    const subtotal = breakdown.reduce((sum, item) => sum + item.total, 0)

    return {
      total: subtotal,
      subtotal,
      discount: 0,
      breakdown,
      applied_rules: [],
    }
  },

  /**
   * Find a matching discipline_hours rule for a class
   */
  findDisciplineHoursRule(
    cls: ClassSelection,
    rules: PricingRule[]
  ): PricingRule | undefined {
    return rules
      .filter((r) => r.rule_type === 'discipline_hours')
      .find((rule) => {
        const condition = rule.conditions as DisciplineHoursCondition
        return (
          condition.discipline_id === cls.discipline_id &&
          cls.hours_per_week >= condition.hours_min &&
          cls.hours_per_week <= condition.hours_max
        )
      })
  },

  /**
   * CRUD operations for pricing rules
   */
  async createPricingRule(rule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>): Promise<PricingRule> {
    const { data, error } = await supabaseAdmin
      .from('pricing_rules')
      .insert(rule)
      .select()
      .single()

    if (error) {
      if (this.isMissingPricingTable(error.message)) {
        const fallback = await this.getFallbackPricingData(rule.tenant_id)
        const now = new Date().toISOString()
        const created = {
          ...rule,
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
        } as PricingRule
        await this.saveFallbackPricingData(rule.tenant_id, [...fallback.rules, created], fallback.categories)
        return created
      }
      throw error
    }
    return data as PricingRule
  },

  async updatePricingRule(id: string, updates: Partial<PricingRule>): Promise<PricingRule> {
    const { data, error } = await supabaseAdmin
      .from('pricing_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (this.isMissingPricingTable(error.message)) {
        const tenantId = updates.tenant_id
        if (!tenantId) {
          throw new Error('tenant_id is required for fallback pricing update')
        }
        const fallback = await this.getFallbackPricingData(tenantId)
        const current = fallback.rules.find((item) => item.id === id)
        if (!current) throw new Error('Pricing rule not found')
        const updated = {
          ...current,
          ...updates,
          updated_at: new Date().toISOString(),
        } as PricingRule
        await this.saveFallbackPricingData(
          tenantId,
          fallback.rules.map((item) => (item.id === id ? updated : item)),
          fallback.categories
        )
        return updated
      }
      throw error
    }
    return data as PricingRule
  },

  async deletePricingRule(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('pricing_rules')
      .delete()
      .eq('id', id)

    if (error) {
      if (this.isMissingPricingTable(error.message)) {
        const { data: settings } = await supabaseAdmin
          .from('school_settings')
          .select('tenant_id, enrollment_config')
          .not('enrollment_config', 'is', null)

        for (const setting of settings || []) {
          const tenantId = setting.tenant_id as string
          const fallback = await this.getFallbackPricingData(tenantId)
          const exists = fallback.rules.some((item) => item.id === id)
          if (exists) {
            await this.saveFallbackPricingData(
              tenantId,
              fallback.rules.filter((item) => item.id !== id),
              fallback.categories
            )
            return
          }
        }
        return
      }
      throw error
    }
  },

  /**
   * CRUD operations for discipline categories
   */
  async createDisciplineCategory(
    category: Omit<DisciplineCategory, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DisciplineCategory> {
    const { data, error } = await supabaseAdmin
      .from('discipline_categories')
      .insert(category)
      .select()
      .single()

    if (error) {
      if (this.isMissingPricingTable(error.message)) {
        const fallback = await this.getFallbackPricingData(category.tenant_id)
        const now = new Date().toISOString()
        const created = {
          ...category,
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
        } as DisciplineCategory
        await this.saveFallbackPricingData(category.tenant_id, fallback.rules, [...fallback.categories, created])
        return created
      }
      throw error
    }
    return data as DisciplineCategory
  },

  async updateDisciplineCategory(
    id: string,
    updates: Partial<DisciplineCategory>
  ): Promise<DisciplineCategory> {
    const { data, error } = await supabaseAdmin
      .from('discipline_categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (this.isMissingPricingTable(error.message)) {
        const tenantId = updates.tenant_id
        if (!tenantId) {
          throw new Error('tenant_id is required for fallback category update')
        }
        const fallback = await this.getFallbackPricingData(tenantId)
        const current = fallback.categories.find((item) => item.id === id)
        if (!current) throw new Error('Discipline category not found')
        const updated = {
          ...current,
          ...updates,
          updated_at: new Date().toISOString(),
        } as DisciplineCategory
        await this.saveFallbackPricingData(
          tenantId,
          fallback.rules,
          fallback.categories.map((item) => (item.id === id ? updated : item))
        )
        return updated
      }
      throw error
    }
    return data as DisciplineCategory
  },

  async deleteDisciplineCategory(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('discipline_categories')
      .delete()
      .eq('id', id)

    if (error) {
      if (this.isMissingPricingTable(error.message)) {
        const { data: settings } = await supabaseAdmin
          .from('school_settings')
          .select('tenant_id, enrollment_config')
          .not('enrollment_config', 'is', null)

        for (const setting of settings || []) {
          const tenantId = setting.tenant_id as string
          const fallback = await this.getFallbackPricingData(tenantId)
          const exists = fallback.categories.some((item) => item.id === id)
          if (exists) {
            await this.saveFallbackPricingData(
              tenantId,
              fallback.rules,
              fallback.categories.filter((item) => item.id !== id)
            )
            return
          }
        }
        return
      }
      throw error
    }
  },
}
