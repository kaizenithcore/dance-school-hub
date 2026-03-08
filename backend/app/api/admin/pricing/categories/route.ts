import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabaseAdmin'
import { pricingService } from '@/lib/services/pricingService'
import { corsHeaders, handleCorsPreFlight } from '@/lib/cors'

const withCors = (request: NextRequest, payload: unknown, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: corsHeaders(request.headers.get('origin')),
  })

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get('origin'))
}

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

// GET /api/admin/pricing/categories - List all discipline categories for tenant
export async function GET(request: NextRequest) {
  try {
    const membership = await resolveMembership(request)

    // Get all categories for this tenant
    const categories = await pricingService.getDisciplineCategories(membership.tenant_id)

    return withCors(request, { categories })
  } catch (error: unknown) {
    console.error('Error fetching discipline categories:', error)
    if (error instanceof Error && error.message === 'unauthorized') {
      return withCors(request, { error: 'No autorizado' }, 401)
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return withCors(request, { error: 'No perteneces a ninguna escuela' }, 403)
    }
    return withCors(
      request,
      { error: error instanceof Error ? error.message : 'Error al cargar las categorías' },
      500
    )
  }
}

// POST /api/admin/pricing/categories - Create a new discipline category
export async function POST(request: NextRequest) {
  try {
    const membership = await resolveMembership(request)

    // Check authorization (admin or owner only)
    if (!['admin', 'owner'].includes(membership.role)) {
      return withCors(request, { error: 'Sin permisos suficientes' }, 403)
    }

    // Parse request body
    const body = await request.json()

    // Create discipline category
    const category = await pricingService.createDisciplineCategory({
      tenant_id: membership.tenant_id,
      name: body.name,
      slug: body.slug,
      description: body.description,
      discipline_ids: body.discipline_ids || [],
      is_bonus_eligible: body.is_bonus_eligible !== false,
      color: body.color,
    })

    return withCors(request, { category }, 201)
  } catch (error: unknown) {
    console.error('Error creating discipline category:', error)
    if (error instanceof Error && error.message === 'unauthorized') {
      return withCors(request, { error: 'No autorizado' }, 401)
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return withCors(request, { error: 'No perteneces a ninguna escuela' }, 403)
    }
    return withCors(
      request,
      { error: error instanceof Error ? error.message : 'Error al crear la categoría' },
      500
    )
  }
}
