# Frontend Shell — Refactor Plan

Objetivo: desacoplar y simplificar el shell administrativo para convertirlo en una base limpia, modular y orientada al MVP sin rediseño completo.

Resumen ejecutivo
- Crear una capa de "shell" ligera y modular que componga `Sidebar`, `Topbar` y contenedor principal.
- Extraer la lógica de negocio y operativa (onboarding, trials, billing, upsells, gating, modales) fuera del layout visual hacia hooks/servicios dedicados.
- Reducir la navegación y widgets visibles al conjunto MVP.

Nueva estructura propuesta
- app/(admin)
- src/components/layout — contenedores y wrappers ligeros (PageContainer, AdminLayout minimal)
- src/components/navigation — piezas de navegación (Sidebar, Topbar, Breadcrumbs)
- src/components/shell — `AdminShell` (composición de Sidebar + Topbar + children)
- src/components/dashboard — widgets y panel principal simplificado
- src/hooks — `useAdminRuntime` para lógica de trials/onboarding/billing (desacoplada)

Responsabilidades por componente
- `AdminShell`: estructura y composición visual (no lógica de negocio). Renderiza `AdminSidebar`, `Topbar` y `children`.
- `AdminSidebar`: navegación (solo decisión de visibilidad basada en `module-map`). No debe contener lógica de facturación ni onboarding.
- `Topbar`: acciones globales (buscar, perfil, notificaciones) — debe delegar llamadas de negocio a hooks (`useAdminRuntime`).
- `AdminLayout`: orquestador de la pantalla actual; debe mantener únicamente la lógica necesaria para composición de banners y el `outlet` de rutas; la mayoría de la lógica migrará a `useAdminRuntime`.
- `useAdminRuntime` (nuevo): contendrá trial sync, flags de gating, bienvenida, onboarding y helpers para abrir modales de negocio. Esto permite testear y mockear comportamiento sin tocar layout.
- `components/dashboard/*`: widgets pequeños, autocontenidos y con prop `visible` según `module-map`.

Dependencias que sacamos del layout
- `useBillingEntitlements` (solo hooks de lectura): seguirán existiendo, pero la lógica de persistencia y checkout debe moverse a `useAdminRuntime`.
- `commercialCatalog`, `planCatalog`, `redirectToBillingCheckout` y demás helpers de checkout: mover a un módulo `billing/shell` o `hooks`.
- Onboarding / section intro state y persistencia local: mover a `useAdminRuntime`.
- PlanDevOverlay y modales de trial/lock: invocados por `useAdminRuntime`, no directamente por layout.

Riesgos pendientes
- Riesgo de break en comportamiento de checkout y trial si la migración parcial no replica exactamente efectos y side-effects. Mitigación: migración incremental con feature-flag y pruebas manuales de flujo de pago.
- Dependencias transitivas: algunos componentes del sidebar y páginas aún referencian `billing.features.*` directamente. Recomendación: sustituir lecturas directas por `useAdminRuntime` o `useBillingEntitlements` solo para lectura, mantener la mutación en `useAdminRuntime`.
- Lint/build: cambios en imports y paths pueden necesitar arreglos en aliases TS/TSConfig; validar en CI.

Plan de entrega (iterativo)
1. Crear `AdminShell` (hecho) y adaptar `AdminLayout` para usarlo (hecho).
2. Implementar `useAdminRuntime` y migrar la lógica de trials/onboarding (siguiente paso).
3. Refactorizar `Topbar` para delegar acciones de negocio a `useAdminRuntime`.
4. Simplificar `AdminSidebar` a mostrar solo módulos `mvp` (ya aplicado parcialmente).
5. Auditar `Dashboard` widgets y esconder componentes no MVP.
6. Ejecutar pruebas E2E de los flujos core.

Métricas de éxito
- `AdminLayout` tamaño y responsabilidad reducidos (medible con líneas de código / cyclomatic complexity).
- Navegación MVP operativa y pruebas E2E core pasando.
- Modularidad: lógica de negocio extraída del layout en `useAdminRuntime`.

Notas finales
- Esta intervención evita cambiar visualmente el producto mientras crea una base mantenible para futuras mejoras.
