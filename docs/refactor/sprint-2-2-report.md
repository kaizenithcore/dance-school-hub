# Sprint 2.2 Report — Frontend shell simplificación

Fecha: 2026-05-16

## Objetivo
Desacoplar el shell frontend para preparar una experiencia MVP premium centrada en escuelas de baile sin rediseño completo ni eliminación de funcionalidades.

## Acciones realizadas (resumen técnico)
- Creada la composición modular `AdminShell` en `src/components/shell/AdminShell.tsx`.
- Actualizado `AdminLayout` para usar `AdminShell` y reducir responsabilidad estructural del layout.
- Continuada la ocultación de módulos no-MVP mediante `src/lib/moduleLifecyclePolicy.ts` y uso de `isModuleVisible` en `AdminSidebar`.
- Ajustes en `DashboardPage` y `WebsitePage` para ocultar analytics y etiquetas `Enterprise` cuando corresponda.
- Documentación entregada: `docs/refactor/frontend-shell.md`, `docs/refactor/layout-responsibilities.md` y `docs/refactor/sprint-2-2-report.md`.

## Archivos divididos / movidos
- Nuevo: `src/components/shell/AdminShell.tsx` — composición de `AdminSidebar` + `Topbar`.
- `AdminLayout` reducido su responsabilidad, ahora delega la estructura a `AdminShell`.

## Lógica desacoplada (plan)
- `useAdminRuntime` (próximo): migrar trial, onboarding, checkout y modales desde `AdminLayout`.
- Externalizar checkout helpers a `src/lib/billing-shell.ts` para mejorar testabilidad.

## Navegación simplificada
- `AdminSidebar` ahora oculta módulos no-MVP mediante `isModuleVisible`.
- Sidebar final recomendado: Dashboard, Alumnos, Clases, Horarios, Profesores, Pagos, Mensajes, Portal alumno, Ajustes.

## Deuda restante
- Migración completa de la lógica de trials/onboarding/checkout a `useAdminRuntime` no realizada en este sprint (pendiente).
- Widgets y páginas secundarias que referencian directamente `billing.features` deben readaptarse.
- Tests E2E y verificación CI pendientes.

## Riesgos y mitigaciones
- Riesgo de divergencia de comportamiento en migración de lógica: mitigar con pruebas manuales y rollout en staging.
- Riesgo de errores de import paths: ejecutar `npm run build` y `npm run lint` en CI antes de merge.

## Próximos pasos
1. Implementar `useAdminRuntime` y migrar la lógica de checkout/trials (alto impacto).
2. Aplicar ocultación visual completa a `Events`, `Branches`, `Renewals` y otras páginas no-MVP.
3. Simplificar dashboard: eliminar widgets secundarios y dejar métricas esenciales.
4. Ejecutar pruebas E2E core + typecheck completo.

