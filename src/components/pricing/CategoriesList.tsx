import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2 } from 'lucide-react'
import type { DisciplineCategory } from '@/lib/api/pricing'

interface Props {
  categories: DisciplineCategory[]
  loading: boolean
  onEdit: (category: DisciplineCategory) => void
  onDelete: (id: string) => void
}

export function CategoriesList({ categories, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Cargando categorías...</p>
        </CardContent>
      </Card>
    )
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No hay categorías configuradas</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crea tu primera categoría para agrupar disciplinas y definir bonos
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {category.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  <CardTitle className="text-base">{category.name}</CardTitle>
                </div>
                <CardDescription className="text-sm mt-1">
                  {category.description || category.slug}
                </CardDescription>
              </div>
              <Badge variant={category.is_bonus_eligible ? 'default' : 'secondary'} className="ml-2">
                {category.is_bonus_eligible ? 'Bonificable' : 'No bonificable'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Disciplinas: </span>
                <span className="font-medium">{category.discipline_ids.length}</span>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(category)}
                  className="flex-1"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(category.id)}
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
