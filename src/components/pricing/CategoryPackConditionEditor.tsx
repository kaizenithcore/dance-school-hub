import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { DisciplineCategory } from '@/lib/api/pricing'

interface Props {
  conditions: { category_slug?: string; hours_min?: number; hours_max?: number }
  categories: DisciplineCategory[]
  onChange: (conditions: { category_slug: string; hours_min: number; hours_max: number }) => void
}

export function CategoryPackConditionEditor({ conditions, categories, onChange }: Props) {
  const [categorySlug, setCategorySlug] = useState(conditions.category_slug || '')
  const [hoursMin, setHoursMin] = useState(conditions.hours_min?.toString() || '1')
  const [hoursMax, setHoursMax] = useState(conditions.hours_max?.toString() || '1')

  useEffect(() => {
    onChange({
      category_slug: categorySlug,
      hours_min: parseFloat(hoursMin) || 0,
      hours_max: parseFloat(hoursMax) || 0,
    })
  }, [categorySlug, hoursMin, hoursMax, onChange])

  const selectedCategory = categories.find((c) => c.slug === categorySlug)

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">Condiciones del Bono</h4>

      <div>
        <Label>Grupo de Bonos</Label>
        <Select value={categorySlug} onValueChange={setCategorySlug}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un grupo" />
          </SelectTrigger>
          <SelectContent>
            {categories.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Aún no se han creado categorías para bonos.
              </div>
            ) : (
              categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {selectedCategory && (
          <p className="text-xs text-muted-foreground mt-1">{selectedCategory.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Horas totales mínimas</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={hoursMin}
            onChange={(e) => setHoursMin(e.target.value)}
          />
        </div>
        <div>
          <Label>Horas totales máximas</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={hoursMax}
            onChange={(e) => setHoursMax(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Este bono se aplicará cuando el alumno seleccione entre {hoursMin} y {hoursMax} horas
        totales de disciplinas en este grupo
      </p>
    </div>
  )
}
