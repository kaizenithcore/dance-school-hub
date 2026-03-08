import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabaseAdmin'
import { pricingService } from '@/lib/services/pricingService'
import { corsHeaders, handleCorsPreFlight } from '@/lib/cors'

const withCors = (request: NextRequest, payload: unknown, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: corsHeaders(request.headers.get('origin')),
  })

async function resolveMembership(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')

  if (authHeader) {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !userData.user) {
      throw new Error('unauthorized')
    }

    const { data: membership } = await supabaseAdmin
      .from('tenant_memberships')
      .select('tenant_id, role')
      .eq('user_id', userData.user.id)
      .single()

    if (!membership) {
      throw new Error('forbidden')
    }

    return membership
  }

  if (process.env.NODE_ENV !== 'production') {
    const devTenantId = request.headers.get('x-tenant-id')
    if (devTenantId) {
      const { data: tenantById } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('id', devTenantId)
        .eq('is_active', true)
        .maybeSingle()

      if (tenantById) {
        return { tenant_id: tenantById.id, role: 'owner' as const }
      }
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (tenant) {
      return { tenant_id: tenant.id, role: 'owner' as const }
    }
  }

  throw new Error('unauthorized')
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get('origin'))
}

// PUT /api/admin/pricing/rules/[id] - Update a pricing rule
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const membership = await resolveMembership(request)

    // Check authorization (admin or owner only)
    if (!['admin', 'owner'].includes(membership.role)) {
      return withCors(request, { error: 'Sin permisos suficientes' }, 403)
    }

    // Verify rule belongs to this tenant
    const { data: existingRule } = await supabaseAdmin
      .from('pricing_rules')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (!existingRule || existingRule.tenant_id !== membership.tenant_id) {
      return withCors(request, { error: 'Tarifa no encontrada' }, 404)
    }

    // Parse request body
    const body = await request.json()

    // Update pricing rule
    const rule = await pricingService.updatePricingRule(id, { ...body, tenant_id: membership.tenant_id })

    return withCors(request, { rule })
  } catch (error: unknown) {
    console.error('Error updating pricing rule:', error)
    if (error instanceof Error && error.message === 'unauthorized') {
      return withCors(request, { error: 'No autorizado' }, 401)
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return withCors(request, { error: 'No perteneces a ninguna escuela' }, 403)
    }
    return withCors(
      request,
      { error: error instanceof Error ? error.message : 'Error al actualizar la tarifa' },
      500
    )
  }
}

// DELETE /api/admin/pricing/rules/[id] - Delete a pricing rule
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const membership = await resolveMembership(request)

    // Check authorization (admin or owner only)
    if (!['admin', 'owner'].includes(membership.role)) {
      return withCors(request, { error: 'Sin permisos suficientes' }, 403)
    }

    // Verify rule belongs to this tenant
    const { data: existingRule } = await supabaseAdmin
      .from('pricing_rules')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (!existingRule || existingRule.tenant_id !== membership.tenant_id) {
      return withCors(request, { error: 'Tarifa no encontrada' }, 404)
    }

    // Delete pricing rule
    await pricingService.deletePricingRule(id)

    return withCors(request, { success: true })
  } catch (error: unknown) {
    console.error('Error deleting pricing rule:', error)
    if (error instanceof Error && error.message === 'unauthorized') {
      return withCors(request, { error: 'No autorizado' }, 401)
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return withCors(request, { error: 'No perteneces a ninguna escuela' }, 403)
    }
    return withCors(
      request,
      { error: error instanceof Error ? error.message : 'Error al eliminar la tarifa' },
      500
    )
  }
}
