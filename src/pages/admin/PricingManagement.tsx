import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus } from 'lucide-react'
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
      console.error('Error loading pricing data:', error)
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
    <PageContainer title="Planes y precios" description="Catálogo simple, claro y fácil de mantener">
      <section className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">El sistema que tu academia se merece</p>
        <p className="mt-1 text-xs text-muted-foreground">Define precios y paquetes sin ruido técnico, con foco comercial.</p>
      </section>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Tarifas</TabsTrigger>
          <TabsTrigger value="categories">Paquetes</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Tarifas y bonos</h2>
              <p className="text-sm text-muted-foreground">
                Configura precios por tipo de clase o combinación de servicios.
              </p>
            </div>
            <Button onClick={() => setShowRuleForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
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
              <h2 className="text-lg font-semibold">Paquetes y grupos</h2>
              <p className="text-sm text-muted-foreground">
                Agrupa disciplinas para vender paquetes más claros y atractivos.
              </p>
            </div>
            <Button onClick={() => setShowCategoryForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
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
