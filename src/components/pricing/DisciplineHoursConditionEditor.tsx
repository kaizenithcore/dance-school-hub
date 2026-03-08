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
import { supabase } from '@/lib/supabase'

interface Discipline {
  id: string
  name: string
}

interface Props {
  conditions: { discipline_id?: string; hours_min?: number; hours_max?: number }
  onChange: (conditions: { discipline_id: string; hours_min: number; hours_max: number }) => void
}

export function DisciplineHoursConditionEditor({ conditions, onChange }: Props) {
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [disciplineId, setDisciplineId] = useState(conditions.discipline_id || '')
  const [hoursMin, setHoursMin] = useState(conditions.hours_min?.toString() || '1')
  const [hoursMax, setHoursMax] = useState(conditions.hours_max?.toString() || '1')

  useEffect(() => {
    void loadDisciplines()
  }, [])

  useEffect(() => {
    onChange({
      discipline_id: disciplineId,
      hours_min: parseFloat(hoursMin) || 0,
      hours_max: parseFloat(hoursMax) || 0,
    })
  }, [disciplineId, hoursMin, hoursMax, onChange])

  async function loadDisciplines() {
    try {
      const { data, error } = await supabase.from('disciplines').select('id, name').order('name')

      if (error) throw error
      setDisciplines(data || [])
    } catch (error) {
      console.error('Error loading disciplines:', error)
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">Condiciones</h4>

      <div>
        <Label>Disciplina</Label>
        <Select value={disciplineId} onValueChange={setDisciplineId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una disciplina" />
          </SelectTrigger>
          <SelectContent>
            {disciplines.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Horas mínimas</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={hoursMin}
            onChange={(e) => setHoursMin(e.target.value)}
          />
        </div>
        <div>
          <Label>Horas máximas</Label>
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
        Esta tarifa se aplicará cuando el alumno seleccione entre {hoursMin} y {hoursMax} horas de
        esta disciplina por semana
      </p>
    </div>
  )
}
