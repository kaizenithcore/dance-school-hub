import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2 } from 'lucide-react'
import type { PricingRule, DisciplineCategory } from '@/lib/api/pricing'

interface Props {
  rules: PricingRule[]
  categories: DisciplineCategory[]
  loading: boolean
  onEdit: (rule: PricingRule) => void
  onDelete: (id: string) => void
}

export function PricingRulesList({ rules, categories, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Cargando tarifas...</p>
        </CardContent>
      </Card>
    )
  }

  if (rules.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No hay tarifas configuradas</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crea tu primera tarifa especial o bono para comenzar
          </p>
        </CardContent>
      </Card>
    )
  }

  function getRuleTypeLabel(type: string) {
    const labels: Record<string, string> = {
      discipline_hours: 'Tarifa por Disciplina',
      category_pack: 'Bono por Grupo',
      total_hours: 'Bono por Horas Totales',
      fixed_discount: 'Descuento Fijo',
      percentage_discount: 'Descuento %',
    }
    return labels[type] || type
  }

  function getConditionSummary(rule: PricingRule) {
    if (rule.rule_type === 'discipline_hours') {
      const cond = rule.conditions as { hours_min: number; hours_max: number }
      return `${cond.hours_min} - ${cond.hours_max} horas/semana`
    }

    if (rule.rule_type === 'category_pack') {
      const cond = rule.conditions as { category_slug: string; hours_min: number; hours_max: number }
      const category = categories.find((c) => c.slug === cond.category_slug)
      return `${category?.name || cond.category_slug}: ${cond.hours_min} - ${cond.hours_max} horas`
    }

    if (rule.rule_type === 'total_hours') {
      const cond = rule.conditions as {
        hours_min: number
        hours_max: number
        included_categories?: string[]
        excluded_disciplines?: string[]
      }
      const categoryLabel = cond.included_categories && cond.included_categories.length > 0
        ? `Grupos: ${cond.included_categories.join(', ')}`
        : 'Todos los grupos de bonos'
      return `${cond.hours_min} - ${cond.hours_max} horas totales · ${categoryLabel}`
    }

    return ''
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rules.map((rule) => (
        <Card key={rule.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base">{rule.name}</CardTitle>
                <CardDescription className="text-sm mt-1">
                  {getConditionSummary(rule)}
                </CardDescription>
              </div>
              <Badge variant={rule.is_active ? 'default' : 'secondary'} className="ml-2">
                {rule.is_active ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">{getRuleTypeLabel(rule.rule_type)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Precio:</span>
                <span className="font-medium text-lg">
                  {rule.price ? `${rule.price.toFixed(2)} €` : '-'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prioridad:</span>
                <span className="font-medium">{rule.priority}</span>
              </div>

              {rule.description && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  {rule.description}
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => onEdit(rule)} className="flex-1">
                  <Edit2 className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(rule.id)}
                  className="flex-1"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Eliminar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
