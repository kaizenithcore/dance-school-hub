import { useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import type { DisciplineCategory } from '@/lib/api/pricing'

interface Discipline {
  id: string
  name: string
}

interface TotalHoursConditions {
  hours_min?: number
  hours_max?: number
  included_categories?: string[]
  excluded_disciplines?: string[]
}

interface Props {
  conditions: TotalHoursConditions
  categories: DisciplineCategory[]
  onChange: (conditions: Required<Pick<TotalHoursConditions, 'hours_min' | 'hours_max'>> & TotalHoursConditions) => void
}

export function TotalHoursConditionEditor({ conditions, categories, onChange }: Props) {
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [hoursMin, setHoursMin] = useState(conditions.hours_min?.toString() || '1')
  const [hoursMax, setHoursMax] = useState(conditions.hours_max?.toString() || '99')
  const [includedCategories, setIncludedCategories] = useState<Set<string>>(
    new Set(conditions.included_categories || [])
  )
  const [excludedDisciplines, setExcludedDisciplines] = useState<Set<string>>(
    new Set(conditions.excluded_disciplines || [])
  )

  useEffect(() => {
    void loadDisciplines()
  }, [])

  useEffect(() => {
    onChange({
      hours_min: parseFloat(hoursMin) || 0,
      hours_max: parseFloat(hoursMax) || 0,
      included_categories: Array.from(includedCategories),
      excluded_disciplines: Array.from(excludedDisciplines),
    })
  }, [hoursMin, hoursMax, includedCategories, excludedDisciplines, onChange])

  async function loadDisciplines() {
    const { data, error } = await supabase.from('disciplines').select('id, name').order('name')
    if (error) {
      console.error('Error loading disciplines:', error)
      return
    }
    setDisciplines(data || [])
  }

  function toggleCategory(slug: string) {
    setIncludedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function toggleDiscipline(id: string) {
    setExcludedDisciplines((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasCategories = useMemo(() => categories.length > 0, [categories])

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">Condiciones del Bono por Horas Totales</h4>

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

      <div className="space-y-2">
        <Label>Categorías incluidas (opcional)</Label>
        {!hasCategories ? (
          <p className="text-xs text-muted-foreground">No hay categorías creadas. Se contarán todas las categorías.</p>
        ) : (
          <div className="border rounded-lg p-3 space-y-2 max-h-36 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${category.id}`}
                  checked={includedCategories.has(category.slug)}
                  onCheckedChange={() => toggleCategory(category.slug)}
                />
                <Label htmlFor={`cat-${category.id}`} className="font-normal cursor-pointer">
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Si no seleccionas categorías, el bono contará horas de todas las disciplinas.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Disciplinas excluidas (opcional)</Label>
        <div className="border rounded-lg p-3 space-y-2 max-h-36 overflow-y-auto">
          {disciplines.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay disciplinas para excluir.</p>
          ) : (
            disciplines.map((discipline) => (
              <div key={discipline.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`disc-${discipline.id}`}
                  checked={excludedDisciplines.has(discipline.id)}
                  onCheckedChange={() => toggleDiscipline(discipline.id)}
                />
                <Label htmlFor={`disc-${discipline.id}`} className="font-normal cursor-pointer">
                  {discipline.name}
                </Label>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
