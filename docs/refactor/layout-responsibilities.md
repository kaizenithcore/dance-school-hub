# Layout Responsibilities — Inventory

Propósito: definir responsabilidades y límites de responsabilidad del layout para facilitar la migración incremental.

## Responsabilidad del layout (permitido)
- Composición visual principal (sidebar, topbar, main container).
- Mostrar banners de estado global (conectividad, entorno demo).
- Renderizar `outlet` para rutas.
- Contenedores de scroll y espacios globales.

## Lógica que NO debe residir en el layout (mover a `useAdminRuntime`)
- Onboarding y guías interactivas (intro sections, first-login modal).
- Trials / lógica de bloqueo por pago y sincronización con Stripe.
- Checkout y persistencia de selección de plan/addons.
- Upsells y simuladores comerciales.
- Modal dialogs para producto (checkout, feature lock, plan reserve).

## Componentes de apoyo
- `AdminSidebar`: navegación y visibilidad basada en `module-map`.
- `Topbar`: acciones globales y delegación de eventos a `useAdminRuntime`.
- `PlanDevOverlay`: herramienta de desarrollo (seguir en lugar no productivo).

## Puntos de integración
- `useBillingEntitlements`: hook de lectura de estado de plan; mutaciones deben pasar por `useAdminRuntime`.
- `commercialCatalog/*`: datos de pricing que pueden seguir siendo importados por `useAdminRuntime` o componentes específicos.

## Checklist de migración incremental
- [ ] Introducir `AdminShell` (hecho).
- [ ] Crear `useAdminRuntime` y migrar trial/checkout (próximo).
- [ ] Refactorizar `Topbar` para consumir `useAdminRuntime` exclusivamente.
- [ ] Auditar pages y componentes que acceden a `billing.features` directamente.

