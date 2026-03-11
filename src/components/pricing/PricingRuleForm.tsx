import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { PricingRule, DisciplineCategory, RuleType } from '@/lib/api/pricing'
import { createPricingRule, updatePricingRule } from '@/lib/api/pricing'
import { DisciplineHoursConditionEditor } from './DisciplineHoursConditionEditor'
import { CategoryPackConditionEditor } from './CategoryPackConditionEditor'
import { TotalHoursConditionEditor } from './TotalHoursConditionEditor'

interface Props {
  rule?: PricingRule
  categories: DisciplineCategory[]
  onClose: () => void
}

export function PricingRuleForm({ rule, categories, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [ruleType, setRuleType] = useState<RuleType>(rule?.rule_type || 'discipline_hours')
  const [price, setPrice] = useState(rule?.price?.toString() || '')
  const [priority, setPriority] = useState(rule?.priority?.toString() || '0')
  const [isActive, setIsActive] = useState(rule?.is_active !== false)
  const [conditions, setConditions] = useState(rule?.conditions || {})

  function validateForm(): string | null {
    const parsedPrice = parseFloat(price)
    const parsedHoursMin = Number(conditions.hours_min)
    const parsedHoursMax = Number(conditions.hours_max)

    if (!name.trim()) {
      return 'El nombre de la tarifa es obligatorio'
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return 'El precio debe ser mayor a 0'
    }

    if (!Number.isFinite(parsedHoursMin) || !Number.isFinite(parsedHoursMax)) {
      return 'Debes indicar un rango de horas válido'
    }

    if (parsedHoursMin <= 0 || parsedHoursMax <= 0) {
      return 'Las horas mínimas y máximas deben ser mayores a 0'
    }

    if (parsedHoursMax < parsedHoursMin) {
      return 'Las horas máximas deben ser iguales o mayores que las mínimas'
    }

    if (ruleType === 'discipline_hours' && !conditions.discipline_id) {
      return 'Selecciona una disciplina para esta tarifa'
    }

    if (ruleType === 'category_pack' && !conditions.category_slug) {
      return 'Selecciona una categoría para este bono'
    }

    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      setLoading(true)

      const data = {
        name,
        description: description || undefined,
        rule_type: ruleType,
        conditions,
        price: price ? parseFloat(price) : undefined,
        priority: parseInt(priority) || 0,
        is_active: isActive,
      }

      if (rule) {
        await updatePricingRule(rule.id, data)
        toast.success('Tarifa actualizada')
      } else {
        await createPricingRule(data)
        toast.success('Tarifa creada')
      }

      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar la tarifa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre de la Tarifa</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Ballet Clásico 2 horas"
        />
      </div>

      <div>
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe cuándo se aplica esta tarifa"
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="rule_type">Tipo de Tarifa</Label>
        <Select value={ruleType} onValueChange={(v) => setRuleType(v as RuleType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="discipline_hours">
              Tarifa por Disciplina + Horas
            </SelectItem>
            <SelectItem value="category_pack">Bono por Categoría</SelectItem>
            <SelectItem value="total_hours">Bono por Horas Totales</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {ruleType === 'discipline_hours' &&
            'Tarifa específica para una disciplina con cierto número de horas'}
          {ruleType === 'category_pack' &&
            'Bono que aplica cuando se seleccionan varias horas de una categoría'}
          {ruleType === 'total_hours' &&
            'Bono que aplica por suma total de horas, opcionalmente filtrando categorías o excluyendo disciplinas'}
        </p>
      </div>

      {/* Condition Editors based on rule type */}
      {ruleType === 'discipline_hours' && (
        <DisciplineHoursConditionEditor
          conditions={conditions}
          onChange={setConditions}
        />
      )}

      {ruleType === 'category_pack' && (
        <CategoryPackConditionEditor
          conditions={conditions}
          categories={categories}
          onChange={setConditions}
        />
      )}

      {ruleType === 'total_hours' && (
        <TotalHoursConditionEditor
          conditions={conditions}
          categories={categories}
          onChange={setConditions}
        />
      )}

      <div>
        <Label htmlFor="price">Precio €</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="42.00"
        />
      </div>

      <div>
        <Label htmlFor="priority">Prioridad</Label>
        <Input
          id="priority"
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Mayor prioridad = se aplica primero. Útil para bonos vs tarifas individuales.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="is_active">Tarifa activa</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : rule ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
