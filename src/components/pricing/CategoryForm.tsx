import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import type { DisciplineCategory } from '@/lib/api/pricing'
import { createDisciplineCategory, updateDisciplineCategory } from '@/lib/api/pricing'
import { supabase } from '@/lib/supabase'

interface Discipline {
  id: string
  name: string
}

interface Props {
  category?: DisciplineCategory
  onClose: () => void
}

export function CategoryForm({ category, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(category?.name || '')
  const [slug, setSlug] = useState(category?.slug || '')
  const [description, setDescription] = useState(category?.description || '')
  const [isBonusEligible, setIsBonusEligible] = useState(category?.is_bonus_eligible !== false)
  const [color, setColor] = useState(category?.color || '#3b82f6')
  const [selectedDisciplines, setSelectedDisciplines] = useState<Set<string>>(
    new Set(category?.discipline_ids || [])
  )
  const [disciplines, setDisciplines] = useState<Discipline[]>([])

  useEffect(() => {
    void loadDisciplines()
  }, [])

  useEffect(() => {
    // Auto-generate slug from name
    if (!category && name) {
      const autoSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setSlug(autoSlug)
    }
  }, [name, category])

  async function loadDisciplines() {
    try {
      const { data, error } = await supabase.from('disciplines').select('id, name').order('name')

      if (error) throw error
      setDisciplines(data || [])
    } catch (error) {
      console.error('Error loading disciplines:', error)
    }
  }

  function toggleDiscipline(disciplineId: string) {
    const newSet = new Set(selectedDisciplines)
    if (newSet.has(disciplineId)) {
      newSet.delete(disciplineId)
    } else {
      newSet.add(disciplineId)
    }
    setSelectedDisciplines(newSet)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setLoading(true)

      const data = {
        name,
        slug,
        description: description || undefined,
        discipline_ids: Array.from(selectedDisciplines),
        is_bonus_eligible: isBonusEligible,
        color: color || undefined,
      }

      if (category) {
        await updateDisciplineCategory(category.id, data)
        toast.success('Categoría actualizada')
      } else {
        await createDisciplineCategory(data)
        toast.success('Categoría creada')
      }

      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar la categoría')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre de la Categoría</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Danza, Bienestar"
          required
        />
      </div>

      <div>
        <Label htmlFor="slug">Identificador (slug)</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="danza"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Se usa internamente para referenciar esta categoría
        </p>
      </div>

      <div>
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe qué disciplinas agrupa esta categoría"
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="color">Color</Label>
        <div className="flex gap-2">
          <Input
            id="color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-20 h-10"
          />
          <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
        </div>
      </div>

      <div>
        <Label>Disciplinas en esta categoría</Label>
        <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
          {disciplines.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay disciplinas disponibles</p>
          )}
          {disciplines.map((discipline) => (
            <div key={discipline.id} className="flex items-center space-x-2">
              <Checkbox
                id={`discipline-${discipline.id}`}
                checked={selectedDisciplines.has(discipline.id)}
                onCheckedChange={() => toggleDiscipline(discipline.id)}
              />
              <Label
                htmlFor={`discipline-${discipline.id}`}
                className="font-normal cursor-pointer flex-1"
              >
                {discipline.name}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Selecciona las disciplinas que pertenecen a esta categoría
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_bonus_eligible"
          checked={isBonusEligible}
          onCheckedChange={setIsBonusEligible}
        />
        <Label htmlFor="is_bonus_eligible">Las horas de estas disciplinas cuentan para bonos</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Si está desactivado, las disciplinas de esta categoría no contabilizarán para bonos
        combinados (útil para clases privadas, etc.)
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : category ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
