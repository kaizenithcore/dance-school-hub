import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabaseAdmin'
import { pricingService } from '@/lib/services/pricingService'
import { handleCorsPreFlight } from '@/lib/cors'
import { requireAuth } from '@/lib/auth/requireAuth'
import { fail, ok } from '@/lib/http'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get('origin'))
}

// GET /api/admin/pricing/rules - List all pricing rules for tenant
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (!auth.authorized || !auth.context) return auth.response

  try {
    const { data: rules, error } = await supabaseAdmin
      .from('pricing_rules')
      .select('*')
      .eq('tenant_id', auth.context.tenantId)
      .order('priority', { ascending: false })
    if (error) throw error
    return ok({ rules: rules ?? [] }, 200, origin)
  } catch (error: unknown) {
    return fail({ code: 'fetch_failed', message: error instanceof Error ? error.message : 'Error al cargar las tarifas' }, 500, origin)
  }
}

// POST /api/admin/pricing/rules - Create a new pricing rule
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (!auth.authorized || !auth.context) return auth.response
  if (!['admin', 'owner'].includes(auth.context.role)) {
    return fail({ code: 'forbidden', message: 'Sin permisos suficientes' }, 403, origin)
  }

  try {
    const body = await request.json()
    const rule = await pricingService.createPricingRule({
      tenant_id: auth.context.tenantId,
      name: body.name,
      description: body.description,
      rule_type: body.rule_type,
      conditions: body.conditions,
      price: body.price,
      discount_amount: body.discount_amount,
      discount_percentage: body.discount_percentage,
      priority: body.priority || 0,
      is_active: body.is_active !== false,
    })
    return ok({ rule }, 201, origin)
  } catch (error: unknown) {
    return fail({ code: 'create_failed', message: error instanceof Error ? error.message : 'Error al crear la tarifa' }, 500, origin)
  }
}
