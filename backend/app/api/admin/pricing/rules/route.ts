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

// GET /api/admin/pricing/rules - List all pricing rules for tenant
export async function GET(request: NextRequest) {
  try {
    const membership = await resolveMembership(request)

    if (!['admin', 'owner'].includes(membership.role)) {
      return withCors(request, { error: 'Sin permisos suficientes' }, 403)
    }

    const { data: allRules, error } = await supabaseAdmin
      .from('pricing_rules')
      .select('*')
      .eq('tenant_id', membership.tenant_id)
      .order('priority', { ascending: false })

    if (error) throw error

    return withCors(request, { rules: allRules })
  } catch (error: unknown) {
    console.error('Error fetching pricing rules:', error)
    if (error instanceof Error && error.message === 'unauthorized') {
      return withCors(request, { error: 'No autorizado' }, 401)
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return withCors(request, { error: 'No perteneces a ninguna escuela' }, 403)
    }
    return withCors(
      request,
      { error: error instanceof Error ? error.message : 'Error al cargar las tarifas' },
      500
    )
  }
}

// POST /api/admin/pricing/rules - Create a new pricing rule
export async function POST(request: NextRequest) {
  try {
    const membership = await resolveMembership(request)

    if (!['admin', 'owner'].includes(membership.role)) {
      return withCors(request, { error: 'Sin permisos suficientes' }, 403)
    }

    const body = await request.json()

    const rule = await pricingService.createPricingRule({
      tenant_id: membership.tenant_id,
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

    return withCors(request, { rule }, 201)
  } catch (error: unknown) {
    console.error('Error creating pricing rule:', error)
    if (error instanceof Error && error.message === 'unauthorized') {
      return withCors(request, { error: 'No autorizado' }, 401)
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return withCors(request, { error: 'No perteneces a ninguna escuela' }, 403)
    }
    return withCors(
      request,
      { error: error instanceof Error ? error.message : 'Error al crear la tarifa' },
      500
    )
  }
}
