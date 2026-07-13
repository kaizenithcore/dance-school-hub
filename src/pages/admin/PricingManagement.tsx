import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Tag, Package } from 'lucide-react'
import { toast } from 'sonner'
import type { PricingRule, DisciplineCategory } from '@/lib/api/pricing'
import {
  getPricingRules,
  getDisciplineCategories,
  deletePricingRule,
  deleteDisciplineCategory,
} from '@/lib/api/pricing'
import { PricingRuleForm } from '@/components/pricing/PricingRuleForm'
import { CategoryForm } from '@/components/pricing/CategoryForm'
import { PricingRulesList } from '@/components/pricing/PricingRulesList'
import { CategoriesList } from '@/components/pricing/CategoriesList'

export function PricingManagement() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [categories, setCategories] = useState<DisciplineCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [editingCategory, setEditingCategory] = useState<DisciplineCategory | null>(null)

  async function loadData() {
    try {
      setLoading(true)
      const [rulesData, categoriesData] = await Promise.all([
        getPricingRules(),
        getDisciplineCategories(),
      ])
      setRules(rulesData)
      setCategories(categoriesData)
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Error loading pricing data:', error)
      toast.error(error instanceof Error ? error.message : 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function handleDeleteRule(id: string) {
    if (!confirm('¿Eliminar esta tarifa?')) return

    try {
      await deletePricingRule(id)
      toast.success('Tarifa eliminada')
      void loadData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la tarifa')
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('¿Eliminar este grupo de bonos? Las tarifas asociadas dejarán de funcionar.')) return

    try {
      await deleteDisciplineCategory(id)
      toast.success('Grupo de bonos eliminado')
      void loadData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el grupo de bonos')
    }
  }

  function handleEditRule(rule: PricingRule) {
    setEditingRule(rule)
    setShowRuleForm(true)
  }

  function handleEditCategory(category: DisciplineCategory) {
    setEditingCategory(category)
    setShowCategoryForm(true)
  }

  function handleCloseRuleForm() {
    setShowRuleForm(false)
    setEditingRule(null)
    void loadData()
  }

  function handleCloseCategoryForm() {
    setShowCategoryForm(false)
    setEditingCategory(null)
    void loadData()
  }

  return (
    <PageContainer title="Tarifas y paquetes">
      <Tabs defaultValue="rules" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <TabsList>
            <TabsTrigger value="rules" className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Tarifas
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Paquetes
            </TabsTrigger>
          </TabsList>
          <p className="text-xs text-muted-foreground max-w-sm text-right hidden sm:block">
            <span className="font-medium text-foreground">Tarifas</span> = precio por clase o tipo de servicio.{" "}
            <span className="font-medium text-foreground">Paquetes</span> = agrupaciones de disciplinas con descuento combinado.
          </p>
        </div>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tarifas individuales</h2>
              <p className="text-xs text-muted-foreground">
                Precio fijo o por clase para cada tipo de servicio o disciplina.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowRuleForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva tarifa
            </Button>
          </div>

          {showRuleForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingRule ? 'Editar Tarifa' : 'Nueva Tarifa'}</CardTitle>
                <CardDescription>
                  Configura una tarifa especial o bono para tus alumnos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PricingRuleForm
                  rule={editingRule || undefined}
                  categories={categories}
                  onClose={handleCloseRuleForm}
                />
              </CardContent>
            </Card>
          )}

          <PricingRulesList
            rules={rules}
            categories={categories}
            loading={loading}
            onEdit={handleEditRule}
            onDelete={handleDeleteRule}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Paquetes y combos</h2>
              <p className="text-xs text-muted-foreground">
                Agrupa disciplinas para ofrecer descuentos combinados o bonos multi-clase.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowCategoryForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo paquete
            </Button>
          </div>

          {showCategoryForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingCategory ? 'Editar Grupo de Bonos' : 'Nuevo Grupo de Bonos'}</CardTitle>
                <CardDescription>
                  Agrupa disciplinas relacionadas para aplicar bonos combinados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryForm
                  category={editingCategory || undefined}
                  onClose={handleCloseCategoryForm}
                />
              </CardContent>
            </Card>
          )}

          <CategoriesList
            categories={categories}
            loading={loading}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
