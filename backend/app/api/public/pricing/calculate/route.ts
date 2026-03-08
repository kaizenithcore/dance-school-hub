import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabaseAdmin'
import { pricingService } from '@/lib/services/pricingService'
import type { ClassSelection } from '@/lib/types/pricing'
import { corsHeaders, handleCorsPreFlight } from '@/lib/cors'

const withCors = (request: NextRequest, payload: unknown, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: corsHeaders(request.headers.get('origin')),
  })

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get('origin'))
}

interface ClassRow {
  id: string
  discipline_id: string | null
  price_cents: number
}

interface DisciplineRow {
  id: string
  name: string
}

interface ScheduleRow {
  id?: string
  class_id: string
  start_time: string
  end_time: string
}

interface SelectionInput {
  class_id: string
  schedule_id?: string
}

// POST /api/public/pricing/calculate - Calculate pricing for selected classes
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { tenant_id, class_ids, selections } = body as {
      tenant_id?: string
      class_ids?: string[]
      selections?: SelectionInput[]
    }

    const rawClassIds = Array.isArray(class_ids) ? class_ids : []
    const rawSelections = Array.isArray(selections) ? selections.filter((item) => item && typeof item.class_id === 'string') : []
    const hasSelections = rawSelections.length > 0

    if (!tenant_id || (!hasSelections && rawClassIds.length === 0)) {
      return withCors(
        request,
        { error: 'Se requiere tenant_id y class_ids' },
        400
      )
    }

    const classIdsToQuery = hasSelections
      ? Array.from(new Set(rawSelections.map((item) => item.class_id)))
      : Array.from(new Set(rawClassIds))

    // Get class details
    const { data: classes, error: classesError } = await supabaseAdmin
      .from('classes')
      .select('id, discipline_id, price_cents')
      .in('id', classIdsToQuery)
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')

    if (classesError) throw classesError

    if (!classes || classes.length === 0) {
      return withCors(request, { error: 'No se encontraron clases' }, 404)
    }

    const typedClasses = classes as ClassRow[]
    const disciplineIds = Array.from(
      new Set(
        typedClasses
          .map((item) => item.discipline_id)
          .filter((value): value is string => Boolean(value))
      )
    )

    const { data: disciplines, error: disciplinesError } = disciplineIds.length
      ? await supabaseAdmin
          .from('disciplines')
          .select('id, name')
          .in('id', disciplineIds)
      : { data: [], error: null }

    if (disciplinesError) throw disciplinesError

    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from('class_schedules')
      .select('id, class_id, start_time, end_time')
      .in('class_id', classIdsToQuery)

    if (schedulesError) throw schedulesError

    const disciplineMap = new Map((disciplines as DisciplineRow[] | null ?? []).map((d) => [d.id, d.name]))
    const classHours = new Map<string, number>()
    const scheduleById = new Map<string, { class_id: string; duration: number }>()

    for (const schedule of (schedules as ScheduleRow[] | null ?? [])) {
      const start = schedule.start_time.split(':').map((part) => parseInt(part, 10))
      const end = schedule.end_time.split(':').map((part) => parseInt(part, 10))
      const startTotal = (start[0] || 0) + (start[1] || 0) / 60
      const endTotal = (end[0] || 0) + (end[1] || 0) / 60
      const duration = Math.max(0, endTotal - startTotal)
      classHours.set(schedule.class_id, (classHours.get(schedule.class_id) || 0) + duration)
      if (schedule.id) {
        scheduleById.set(schedule.id, { class_id: schedule.class_id, duration })
      }
    }

    const classMap = new Map(typedClasses.map((item) => [item.id, item]))

    const expandedSelections: ClassSelection[] = []
    if (hasSelections) {
      for (const selection of rawSelections) {
        const classRow = classMap.get(selection.class_id)
        if (!classRow) continue

        const totalClassHours = classHours.get(classRow.id) || 1
        const selectedSchedule = selection.schedule_id ? scheduleById.get(selection.schedule_id) : undefined
        const selectionHours = selectedSchedule && selectedSchedule.class_id === classRow.id
          ? Math.max(selectedSchedule.duration, 0)
          : totalClassHours
        const ratio = totalClassHours > 0 ? selectionHours / totalClassHours : 1
        const selectionBasePrice = ((classRow.price_cents || 0) / 100) * ratio

        expandedSelections.push({
          class_id: classRow.id,
          discipline_id: classRow.discipline_id || 'general',
          discipline_name: classRow.discipline_id ? disciplineMap.get(classRow.discipline_id) || 'General' : 'General',
          hours_per_week: selectionHours || 1,
          base_price: selectionBasePrice,
        })
      }
    }

    if (!hasSelections && rawClassIds.length > 0) {
      const occurrenceByClass = new Map<string, number>()
      for (const classId of rawClassIds) {
        occurrenceByClass.set(classId, (occurrenceByClass.get(classId) || 0) + 1)
      }

      for (const cls of typedClasses) {
        const count = occurrenceByClass.get(cls.id) || 0
        for (let i = 0; i < count; i += 1) {
          expandedSelections.push({
            class_id: cls.id,
            discipline_id: cls.discipline_id || 'general',
            discipline_name: cls.discipline_id ? disciplineMap.get(cls.discipline_id) || 'General' : 'General',
            hours_per_week: classHours.get(cls.id) || 1,
            base_price: (cls.price_cents || 0) / 100,
          })
        }
      }
    }

    if (expandedSelections.length === 0) {
      return withCors(request, { error: 'No se encontraron selecciones validas' }, 404)
    }

    // Calculate pricing
    const pricing = await pricingService.calculatePricing(tenant_id, expandedSelections)

    const baseTotal = expandedSelections.reduce((sum, item) => sum + item.base_price, 0)
    const savings = Math.max(0, baseTotal - pricing.total)

    const categories = await pricingService.getDisciplineCategories(tenant_id)
    const activeRules = await pricingService.getActivePricingRules(tenant_id)

    const categoryByDiscipline = new Map<string, string[]>()
    const wildcardCategorySlugs: string[] = []
    for (const category of categories) {
      if (!category.discipline_ids || category.discipline_ids.length === 0) {
        wildcardCategorySlugs.push(category.slug)
      }
      for (const disciplineId of category.discipline_ids) {
        const existing = categoryByDiscipline.get(disciplineId) || []
        existing.push(category.slug)
        categoryByDiscipline.set(disciplineId, existing)
      }
    }

    const categoryHours = new Map<string, number>()
    const categoryBase = new Map<string, number>()
    for (const selection of expandedSelections) {
      const mappedSlugs = categoryByDiscipline.get(selection.discipline_id) || []
      const slugs = Array.from(new Set([...mappedSlugs, ...wildcardCategorySlugs]))
      for (const slug of slugs) {
        categoryHours.set(slug, (categoryHours.get(slug) || 0) + selection.hours_per_week)
        categoryBase.set(slug, (categoryBase.get(slug) || 0) + selection.base_price)
      }
    }

    const nearRules = activeRules
      .filter((rule) => rule.rule_type === 'category_pack')
      .map((rule) => {
        const conditions = rule.conditions as { category_slug?: string; hours_min?: number }
        const categorySlug = conditions.category_slug || ''
        const targetHours = conditions.hours_min || 0
        const currentHours = categoryHours.get(categorySlug) || 0
        return {
          rule,
          categorySlug,
          targetHours,
          currentHours,
          missingHours: Math.max(0, targetHours - currentHours),
        }
      })
      .filter((item) => item.categorySlug && item.currentHours > 0 && item.missingHours > 0)
      .sort((a, b) => a.missingHours - b.missingHours)

    const nearest = nearRules[0]
    const hint = nearest
      ? {
          categorySlug: nearest.categorySlug,
          categoryName: categories.find((item) => item.slug === nearest.categorySlug)?.name || nearest.categorySlug,
          currentHours: nearest.currentHours,
          targetHours: nearest.targetHours,
          missingHours: nearest.missingHours,
          bonusName: nearest.rule.name,
          bonusPrice: nearest.rule.price || 0,
          potentialSavings: (() => {
            const base = categoryBase.get(nearest.categorySlug) || 0
            const avgHour = nearest.currentHours > 0 ? base / nearest.currentHours : 0
            const estimatedAtTarget = avgHour * nearest.targetHours
            return Math.max(0, estimatedAtTarget - (nearest.rule.price || 0))
          })(),
        }
      : undefined

    return withCors(request, {
      pricing: {
        ...pricing,
        savings,
        hint,
      },
    })
  } catch (error: unknown) {
    console.error('Error calculating pricing:', error)
    return withCors(
      request,
      { error: error instanceof Error ? error.message : 'Error al calcular el precio' },
      500
    )
  }
}
