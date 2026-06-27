import { NextRequest } from 'next/server'
import { pricingService } from '@/lib/services/pricingService'
import { corsHeaders, handleCorsPreFlight } from '@/lib/cors'
import { requireAuth } from '@/lib/auth/requireAuth'
import { fail, ok } from '@/lib/http'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request.headers.get('origin'))
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (!auth.authorized || !auth.context) return auth.response

  try {
    const categories = await pricingService.getDisciplineCategories(auth.context.tenantId)
    return ok({ categories }, 200, origin)
  } catch (error: unknown) {
    return fail({ code: 'fetch_failed', message: error instanceof Error ? error.message : 'Error al cargar las categorías' }, 500, origin)
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (!auth.authorized || !auth.context) return auth.response
  if (!['admin', 'owner'].includes(auth.context.role)) {
    return fail({ code: 'forbidden', message: 'Sin permisos suficientes' }, 403, origin)
  }

  try {
    const body = await request.json()
    const category = await pricingService.createDisciplineCategory({
      tenant_id: auth.context.tenantId,
      name: body.name,
      slug: body.slug,
      description: body.description,
      discipline_ids: body.discipline_ids || [],
      is_bonus_eligible: body.is_bonus_eligible !== false,
      color: body.color,
    })
    return ok({ category }, 201, origin)
  } catch (error: unknown) {
    return fail({ code: 'create_failed', message: error instanceof Error ? error.message : 'Error al crear la categoría' }, 500, origin)
  }
}
