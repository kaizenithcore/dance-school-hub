Plan propuesto para implementar límites reales y catálogo nuevo

Definir una única fuente de verdad de planes y ciclos
Alinear backend de entitlements y límites de alumnos
Alinear checkout de Stripe con precios mensuales y anuales
Alinear UI de administración y mensajes de upgrade
Migrar tenants existentes sin romper configuraciones
Validar con pruebas y rollout controlado
Fase 1: Fuente de verdad única (catálogo comercial)

Crear un catálogo central con:
Planes: Starter, Pro, Enterprise.
Ciclo mensual y anual.
Precio mensual de referencia y precio anual facturado.
Límite base de alumnos por plan.
Precio y tamaño de bloque extra por plan.
Features incluidas por plan y addons.
Ubicación recomendada:
Backend: featureEntitlementsService.ts
Frontend admin (hoy duplicado): SettingsPage.tsx:140
Resultado esperado:
Eliminar hardcodes duplicados y divergencias entre landing, settings y checkout.
Fase 2: Límites reales y gating en backend

Llevar los límites reales al resolved billing:
Hoy se resuelven en featureEntitlementsService.ts.
Confirmar enforcement de cupo de alumnos:
Cálculo/validación actual en studentQuotaService.ts.
Bloqueo al crear alumno en route.ts:57.
Asegurar que todos los endpoints “premium” dependan solo de entitlements resueltos (sin lógica duplicada).
Fase 3: Stripe y facturación anual real

Actualizar importes de checkout backend:
Hoy siguen antiguos en route.ts:23.
Agregar soporte explícito de ciclo:
Campo billingCycle: monthly | annual en payload de checkout.
Ajustar creación de line items para anual (o usar Price IDs anuales).
Actualizar contratos frontend:
Tipos de checkout en stripe.ts.
Flujo de upgrade en useBillingEntitlements.ts:109.
Fase 4: UI admin alineada con catálogo nuevo

Corregir catálogo mostrado en configuración:
Hoy muestra precios y límites antiguos en SettingsPage.tsx:140.
Mantener consistencia con la landing:
Landing actual ya tiene anual 149/374/749 y mensual 179/449/899 en Pricing.tsx.
Revisar mensajes de capacidad y upgrade:
StudentsPage.tsx:231
UpgradeFeatureAlert.tsx
FeatureLockDialog.tsx
Fase 5: Migración de datos de tenants existentes

Crear script/migración que:
Recalcule billing.limits, billing.pricing y billing.features desde plan + addons.
Preserve overrides válidos si existen.
Punto de entrada para persistencia de config:
route.ts:242
Estrategia:
Dry-run primero.
Backup de payment_config.
Ejecución por lotes.
Reconciliación post-migración.
Fase 6: QA y despliegue

Pruebas backend:
Resolver entitlements por plan y addons.
Enforce de cupos con y sin bloques.
Checkout mensual/anual con importes correctos.
Pruebas frontend:
Settings refleja catálogo correcto.
Upgrade CTA abre checkout correcto.
Mensajes de capacidad consistentes.
Rollout:
Feature flag para anual en checkout.
Monitorear errores de creación de sesión Stripe y bloqueos por límite.

Decisiones que conviene cerrar antes de implementar

Límite base real de Enterprise: ¿700 exactos + bloques, o un base mayor para enterprise? El límite base de enterprise son 4000 alumnoos, escuelas más grandes podrían comprar bloques extra para llegar a 7000 o más, pero el límite base de enterprise no debería ser tan bajo que las escuelas grandes tengan que comprar bloques extra solo para llegar a 700 alumnos.
Precio de bloques extra para Pro y Enterprise en el nuevo modelo (si cambian o se mantienen). Se mantienen los precios actuales de bloque extra para Pro y Enterprise, pero se eliminan los bloques extra para Starter.
Si addons de waitlist/renewal siguen existiendo para Starter cuando esas capacidades ya están incluidas en Pro+. Los addons de waitlist/renewal se eliminan para Starter, ya que esas capacidades ahora están incluidas en Pro y Enterprise.
Si el checkout por defecto en admin será anual (recomendado comercialmente) o mensual. El checkout por defecto en admin será anual, pero se mantendrá la opción de mensual para clientes que prefieran esa modalidad. 
Si se mantiene la opción de ciclo mensual en el checkout, se debe asegurar que los precios y límites mostrados sean consistentes con el catálogo actualizado.
