import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Loader2, Tag, Sparkles } from 'lucide-react'
import type { PricingCalculation } from '@/lib/api/pricing'
import type { PricingSelectionInput } from '@/lib/api/pricing'
import { calculatePricing } from '@/lib/api/pricing'

export interface SelectedClass {
  id: string
  pricingClassId?: string
  pricingScheduleId?: string
  name: string
  price: number
  day?: string
  time?: string
}

export interface EnrollmentFeeInfo {
  enabled: boolean
  amount: number
  currency: string
  allowCash: boolean
}

interface Props {
  tenantId: string
  selectedClasses: SelectedClass[]
  onRemoveClass: (id: string) => void
  showRemoveButtons?: boolean
  enrollmentFee?: EnrollmentFeeInfo
}

export function DynamicPricingSummary({
  tenantId,
  selectedClasses,
  onRemoveClass,
  showRemoveButtons = true,
  enrollmentFee,
}: Props) {
  const [pricing, setPricing] = useState<PricingCalculation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedClasses.length === 0) {
      setPricing(null)
      return
    }

    loadPricing()
  }, [selectedClasses, tenantId])

  async function loadPricing() {
    try {
      setLoading(true)
      setError(null)

      const classIds = selectedClasses.map((c) => c.pricingClassId || c.id)
      const selections: PricingSelectionInput[] = selectedClasses.map((c) => ({
        class_id: c.pricingClassId || c.id,
        schedule_id: c.pricingScheduleId,
      }))
      const result = await calculatePricing(tenantId, classIds, selections)

      setPricing(result)
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Error calculating pricing:', err)
      setError(err instanceof Error ? err.message : 'Error al calcular el precio')
      // Fallback: sum unique class prices (one price per pricingClassId)
      const seen = new Set<string>()
      const fallbackTotal = selectedClasses.reduce((sum, c) => {
        const key = c.pricingClassId || c.id
        if (seen.has(key)) return sum
        seen.add(key)
        return sum + c.price
      }, 0)
      setPricing({
        total: fallbackTotal,
        subtotal: fallbackTotal,
        discount: 0,
        breakdown: selectedClasses.map((c) => ({
          type: 'class',
          description: c.name,
          total: c.price,
          class_ids: [c.id],
        })),
        applied_rules: [],
        savings: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  if (selectedClasses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            No hay clases seleccionadas
          </p>
        </CardContent>
      </Card>
    )
  }

  const hasBonuses = Boolean(pricing && pricing.applied_rules.length > 0)
  const hasDiscount = Boolean(pricing && pricing.discount > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumen de Matrícula</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Classes List — grouped by class, price shown once per class */}
        <div className="space-y-2">
          {(() => {
            const groups = new Map<string, typeof selectedClasses>()
            for (const cls of selectedClasses) {
              const key = cls.pricingClassId || cls.id
              const group = groups.get(key) ?? []
              group.push(cls)
              groups.set(key, group)
            }
            return Array.from(groups.entries()).map(([groupKey, slots]) => {
              const first = slots[0]
              return (
                <div key={groupKey} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{first.name}</p>
                      {slots.map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between mt-1">
                          {(slot.day || slot.time) && (
                            <p className="text-xs text-muted-foreground">
                              {slot.day} {slot.time}
                            </p>
                          )}
                          {showRemoveButtons && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveClass(slot.id)}
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-medium shrink-0">€{first.price.toFixed(2)}</span>
                  </div>
                </div>
              )
            })
          })()}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Calculando precio...</span>
          </div>
        )}

        {/* Applied Bonuses/Rules */}
        {!loading && hasBonuses && (
          <div className="space-y-2 p-3 rounded-lg border bg-success/5 border-success/20">
            <div className="flex items-center gap-2 text-success font-medium text-sm">
              <Tag className="h-3 w-3" />
              <span>Bonos aplicados</span>
            </div>
            {pricing.applied_rules.map((rule, index) => (
              <div key={index} className="text-xs text-muted-foreground pl-5">
                <span className="font-medium">{rule.rule_name}</span>
                {rule.description && <span> - {rule.description}</span>}
              </div>
            ))}
            {pricing.savings > 0 && (
              <div className="text-xs text-success font-medium pl-5">
                Ahorro aplicado: €{pricing.savings.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {!loading && pricing?.hint && !hasBonuses && (
          <div className="space-y-1 p-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Estás cerca de un bono</span>
            </div>
            <p className="text-xs">
              Te faltan {pricing.hint.missingHours.toFixed(1)}h en {pricing.hint.categoryName} para aplicar
              " {pricing.hint.bonusName} " ({pricing.hint.bonusPrice.toFixed(2)}€).
            </p>
            {pricing.hint.potentialSavings > 0 && (
              <p className="text-xs font-medium">
                Ahorro potencial estimado: €{pricing.hint.potentialSavings.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-xs text-warning p-2 rounded bg-warning/10 border border-warning/20">
            {error} - Mostrando precios base
          </div>
        )}

        {/* Pricing Breakdown */}
        {!loading && pricing && (
          <div className="space-y-2 pt-2 border-t">
            {/* Breakdown Items (only show packs, not individual classes already shown above) */}
            {pricing.breakdown
              .filter((item) => item.type === 'pack')
              .map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-success font-medium">{item.description}</span>
                  <span className="text-success font-medium">€{item.total.toFixed(2)}</span>
                </div>
              ))}

            {/* Subtotal */}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>€{pricing.subtotal.toFixed(2)}</span>
            </div>

            {/* Discount */}
            {hasDiscount && (
              <div className="flex justify-between text-sm text-success">
                <span>Descuento</span>
                <span>-€{pricing.discount.toFixed(2)}</span>
              </div>
            )}

            {/* Enrollment fee (informational, not collected by Nexa) */}
            {enrollmentFee?.enabled && enrollmentFee.amount > 0 && (
              <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex justify-between text-sm font-medium text-amber-900">
                  <span>Matrícula</span>
                  <span>€{enrollmentFee.amount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-amber-800">
                  Importe informativo, no incluido en el total ni gestionado por esta plataforma.
                  Se abona directamente en la escuela
                  {enrollmentFee.allowCash ? " (efectivo o transferencia)" : " por transferencia"}.
                </p>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>€{pricing.total.toFixed(2)}</span>
            </div>

            {!hasBonuses && pricing.savings > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Ahorro potencial</span>
                <span>€{pricing.savings.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
