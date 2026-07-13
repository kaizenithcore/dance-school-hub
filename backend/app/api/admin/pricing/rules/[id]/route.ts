import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabaseAdmin'
import { pricingService } from '@/lib/services/pricingService'
import { handleCorsPreFlight } from '@/lib/cors'
import { requireAuth } from '@/lib/auth/requireAuth'
import { fail, ok } from '@/lib/http'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get('origin'))
}

// PUT /api/admin/pricing/rules/[id] - Update a pricing rule
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (!auth.authorized || !auth.context) return auth.response
  if (!['admin', 'owner'].includes(auth.context.role)) {
    return fail({ code: 'forbidden', message: 'Sin permisos suficientes' }, 403, origin)
  }

  try {
    const { data: existingRule } = await supabaseAdmin
      .from('pricing_rules')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (!existingRule || existingRule.tenant_id !== auth.context.tenantId) {
      return fail({ code: 'not_found', message: 'Tarifa no encontrada' }, 404, origin)
    }

    const body = await request.json()
    const rule = await pricingService.updatePricingRule(id, { ...body, tenant_id: auth.context.tenantId })
    return ok({ rule }, 200, origin)
  } catch (error: unknown) {
    return fail({ code: 'update_failed', message: error instanceof Error ? error.message : 'Error al actualizar la tarifa' }, 500, origin)
  }
}

// DELETE /api/admin/pricing/rules/[id] - Delete a pricing rule
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (!auth.authorized || !auth.context) return auth.response
  if (!['admin', 'owner'].includes(auth.context.role)) {
    return fail({ code: 'forbidden', message: 'Sin permisos suficientes' }, 403, origin)
  }

  try {
    const { data: existingRule } = await supabaseAdmin
      .from('pricing_rules')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (!existingRule || existingRule.tenant_id !== auth.context.tenantId) {
      return fail({ code: 'not_found', message: 'Tarifa no encontrada' }, 404, origin)
    }

    await pricingService.deletePricingRule(id)
    return ok({ success: true }, 200, origin)
  } catch (error: unknown) {
    return fail({ code: 'delete_failed', message: error instanceof Error ? error.message : 'Error al eliminar la tarifa' }, 500, origin)
  }
}
